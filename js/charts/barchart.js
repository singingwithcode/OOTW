class Barchart {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _col, _header, _xL, _yL, _xLH) {
        // Configuration object with defaults
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 275,
            containerHeight: _config.containerHeight || 275,
            margin: _config.margin || {top: 30, right: 10, bottom: 20, left: 70},
            header: _header,
            xL: _xL,
            yL: _yL,
            XAxisLabelHeight: _xLH
        }
        this.data = _data;
        this.col = _col;
        this.initVis();
    }

    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom - vis.config.XAxisLabelHeight;

        // Initialize scales and axes
        // Important: we flip array elements in the y output range to position the rectangles correctly
        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]) 

        vis.xScale = d3.scaleBand()
            .range([0, vis.width])
            .paddingInner(0.2);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSizeOuter(0);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(6)
            .tickSizeOuter(0);
            //.tickFormat(d3.formatPrefix('.0s', 1e6)); // Format y-axis ticks as millions
        
        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('class', 'barchart')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // SVG Group containing the actual chart; D3 margin convention
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append empty x-axis group and move it to the bottom of the chart
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);
        
        // Append y-axis group 
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis')
            .attr('transform', `translate(0,0)`);

        // Header
        vis.svg.append("text")
            .attr("y", 24)
            .attr("x", vis.config.containerWidth/2)
            .style("font-size", "22px")
            .attr("text-anchor", "middle")
            .text(vis.config.header);

        // yL
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(vis.config.containerHeight/2))
            .attr("y", 10)
            .style("text-anchor", "middle")
            .text(vis.config.yL);

        // xL
        vis.svg.append("text")
            .attr("transform", "translate(" + (vis.config.containerWidth/2) + " ," + (vis.config.containerHeight - 5) + ")")
            .style("text-anchor", "middle")
            .text(vis.config.xL);
    }

    // Helper for dec. data
    compare(x, y) {
        if (x.value < y.value) {
            return 1;
        }
        if (x.value > y.value) {
            return -1;
        }
        return 0;
    }

    /**
     * Prepare data and scales before we render it
     */
    updateVis() {
        let vis = this;

        const dataMap = d3.rollups(vis.data, v => d3.sum(v, d => !d.filtered), d => d[this.col]);
        vis.combData = Array.from(dataMap, ([key, value]) => ({key, value}));

        if(this.col === "st_spectype") {
            vis.combData = vis.combData.filter(obj => ["A", "F", "G", "K", "M", "Unknown"].includes(obj.key))
        }

        vis.combData.sort(this.compare);

        // Specificy x- and y-accessor functions
        vis.xValue = d => d.key;
        vis.yValue = d => d.value;

        // Set the scale input domains
        vis.xScale.domain(vis.combData.map(vis.xValue));
        vis.yScale.domain([0, d3.max(vis.combData, vis.yValue) + 1]);

        vis.renderVis();
    }

    /**
     * Bind data to visual elements
     */
    renderVis() {
        let vis = this;

        // Add rectangles
        const bars = vis.chart.selectAll('.bar')
            .data(vis.combData, vis.xValue)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => vis.xScale(vis.xValue(d)))
            .attr('width', vis.xScale.bandwidth() * .9)
            .attr('transform', `translate(${vis.xScale.bandwidth() * .50}, 0)`)
            .attr('y', vis.yScale(0))
            .attr('height', 0)
            .attr('class', function(d) {
                if(MAINFILTER.find(f => (f[0] === vis.col && f[1].includes(d.key)))){
                    return 'bar active' 
                } else {
                    return 'bar'
                }
            });

            bars.transition().duration(1000)
            .attr('height', d => vis.height - vis.yScale(vis.yValue(d)))
            .attr('y', d => vis.yScale(vis.yValue(d)));

            bars.on('click', function(event, d) {
                vis.enactFilter(d.key);
            });
        
        // Tooltip event listeners
        bars
            .on('mouseover', (event, d) => {
                d3.select('#tooltip')
                .style('display', 'block')
                .style('left', (event.pageX - 65) + 'px')   
                .style('top', (event.pageY + 5) + 'px')
                .html(`
                    <div class="tooltip-title">${vis.config.xL}: ${d.value}</div>
                `);
            })
            .on('mouseleave', () => {
                d3.select('#tooltip').style('display', 'none');
            });

        vis.xAxisG.call(vis.xAxis)
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-55)")
            .style("text-anchor", "end");
        vis.yAxisG.call(vis.yAxis);

        vis.chart.select('.x-axis')
            .selectAll('.tick text')
            .attr('class', function(d) {
                if(MAINFILTER.find(f => (f[0] === vis.col && f[1].includes(d)))) {
                    return 'active' 
                } else {
                    return ''
                }
            })
            .on('click', function(event, d) {
                let xL = event.srcElement.__data__
                vis.enactFilter(xL)
            });
    }

    enactFilter(newFilter) {
        let featureFilter = MAINFILTER.find(f => (f[0] === this.col));
        const featureIndex = MAINFILTER.indexOf(featureFilter);

        if (featureIndex === -1) {
            MAINFILTER.push([this.col, [newFilter]]); 
        
        } else { 
            let selectedFilter = MAINFILTER[featureIndex];
            let specificnewFilter = selectedFilter[1].find(s => (s === newFilter));
            const selectedFilterIndex = selectedFilter[1].indexOf(specificnewFilter);

            if (selectedFilterIndex > -1) {
                if (selectedFilter[1].length === 1) {
                    MAINFILTER.splice(featureIndex, 1); 
                    selectedFilter[1].splice(selectedFilterIndex, 1); 
                }
            } else { 
                selectedFilter[1].push(newFilter); 
            }
        }
        dataFilter(); 
    }
}
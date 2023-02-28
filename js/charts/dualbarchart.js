class DualBarchart {
    /**
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _col, _col2, _header, _xL, _yL, _xLH = 20) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 275,
            containerHeight: _config.containerHeight || 275,
            margin: _config.margin || {top: 60, right: 10, bottom: 20, left: 70},
            title: _header,
            xLabel: _xL,
            yLabel: _yL,
            XAxisLabelHeight: _xLH
        }
        this.data = _data;
        this.aggregateAttr = _col;
        this.separationAttr = _col2;
        this.initVis();
    } 

    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right - 20;
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
            .tickSizeOuter(0)

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
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

        // Title
        vis.svg.append("text")
            .attr("x", vis.config.containerWidth/2 - 50)
            .attr("y", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .text(vis.config.title);

        // Y-Axis Label
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", - (vis.config.containerHeight/2))
            .attr("y", 20)
            .style("text-anchor", "middle")
            .text(vis.config.yLabel);

        // X-Axis Label
        vis.svg.append("text")
            .attr("transform", "translate(" + (vis.config.containerWidth/2) + " ," + (vis.config.containerHeight - 5) + ")")
            .style("text-anchor", "middle")
            .text(vis.config.xLabel);

        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr('transform', 'translate(0,-10)')
    
        vis.colors = [["Habitable", "#A387F9"], ["Uninhabitable", "#705EA7"]];
        
        let legendText = vis.legend.selectAll('text').data(vis.colors);
        legendText.enter()
            .append("text")
            .attr("font-size", 12)
            .attr("x", vis.config.containerWidth - 75)
            .attr("y", function(d, i) {
                return i * 20 + 34;
            })
            .text(function(d) {
                return d[0];
            });
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
    updateVis(onit = false){
        let vis = this;
        const aggregatedDataMap = d3.group(vis.data.filter(d => d.filtered === false), d => d[vis.aggregateAttr], d => d[vis.separationAttr])
        vis.aggregatedData = Array.from(aggregatedDataMap, ([key, groupsBySeparator]) => ({ key, groupsBySeparator }));

        if(this.aggregateAttr === "st_spectype"){
            vis.aggregatedData = vis.aggregatedData.filter(obj => ["A", "F", "G", "K", "M"].includes(obj.key))
        }
        
        vis.groupedData = []
        vis.aggregatedData.forEach(d => {
            let uCount, hCount = 0;
            if( d.groupsBySeparator.has(false)) {
                uCount = d.groupsBySeparator.get(false).length;
            }
            if( d.groupsBySeparator.has(true)) {
                hCount = d.groupsBySeparator.get(true).length;
            }
            if( uCount === undefined){
                uCount = 0
            }
            vis.groupedData.push( {key: d.key, uninhabitable: uCount, habitable: hCount} );
        });

        if(onit){
            vis.groupedData.sort(this.compare);
        }

        vis.xValue = d => d.key;
        vis.yValue1 = d => d.uninhabitable;
        vis.yValue2 = d => d.habitable;

        if(onit){
            vis.xScale.domain(vis.groupedData.map(vis.xValue));
            vis.yScale.domain([0, 650]);
        }

        vis.renderVis(onit);
    }

    renderVis(onit) {
        let vis = this;

        let graph1 = vis.svg.selectAll(".habitableBar")
    					.data(vis.groupedData);
        let graph2 = vis.svg.selectAll(".uninhabitableBar")
    					.data(vis.groupedData);

        let firstBarGroup = graph2.join("rect")
            .attr('class', 'bar')
            .attr('class', 'uninhabitableBar')
            .attr("x", d => vis.xScale(vis.xValue(d)))
            .attr("width", 15)
            .attr('y', vis.yScale(0))
            .attr('height', 0)
            .attr("transform", "translate(" + 72 + "," + vis.config.margin.top + ")")
            .attr("fill", "#705EA7");

        let secondBarGroup = graph1.join("rect")
            .attr('class', 'bar')
            .attr('class', 'habitableBar')
            .attr("x", d => vis.xScale(vis.xValue(d)))
            .attr("width", 15)
            .attr('y', vis.yScale(0))
            .attr('height', 0)
            .attr("transform", "translate(" + 87 + "," + vis.config.margin.top + ")")
            .attr("fill", "#9f6fff");

        firstBarGroup.transition().duration(1000)
            .attr('height', d => vis.height - vis.yScale(vis.yValue1(d)))
            .attr('y', d => vis.yScale(vis.yValue1(d)));
        secondBarGroup.transition().duration(1000)
            .attr('height', d => vis.height - vis.yScale(vis.yValue2(d)))
            .attr('y', d => vis.yScale(vis.yValue2(d)));

        vis.svg.selectAll(".habitableBar").on('mouseover', (event, d) => {
            d3.select('#tooltip')
            .style('display', 'block')
            .style('left', (event.pageX - 65) + 'px')   
            .style('top', (event.pageY + 15) + 'px')
            .html(`
                <div class="tooltip-title">Habitable</div>
                <ul>
                <li>Star Type: ${d.key}</li>
                <li># Exoplanets: ${d.habitable}</li>
                </ul>
            `);
        })
        .on('mouseleave', () => {
            d3.select('#tooltip').style('display', 'none');
        });

        vis.svg.selectAll(".uninhabitableBar").on('mouseover', (event, d) => {
            d3.select('#tooltip')
            .style('display', 'block')
            .style('left', (event.pageX - 65) + 'px')   
            .style('top', (event.pageY + 15) + 'px')
            .html(`
                <div class="tooltip-title">Uninhabitable</div>
                <ul>
                <li>Star Type: ${d.key}</li>
                <li># Exoplanets: ${d.uninhabitable}</li>
                </ul>
            `);
        })
        .on('mouseleave', () => {
            d3.select('#tooltip').style('display', 'none');
        });

        vis.legend.selectAll('circle').data(vis.colors)
            .join("circle")
            .attr("cx", vis.config.containerWidth - 85)
            .attr("r", 6)
            .attr("width", 10)
            .attr("height", 10)
            .classed("active", function(d) {
                let filterStr
                if (d[0] === "Habitable"){
                    filterStr = true;
                } else {
                    filterStr = false;
                }
                if (MAINFILTER.find(f => (f[0] === vis.separationAttr && f[1].includes(filterStr)))) {
                    return true
                } else {
                    return false
                }
            })
            .attr("cy", function(d, i) {
                return i * 20 + 30;
            })
            .style("fill", function(d) {
                return d[1];
            })
            .on('click', function(event, d) {
                if (d[0] === "Habitable") {
                    vis.enactFilter(true);
                } else {
                    vis.enactFilter(false)
                }
            });

        if (onit) {
            vis.xAxisG.call(vis.xAxis)
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");
        
            }
        vis.yAxisG.call(vis.yAxis);
    }

    enactFilter(newFilter){
        let featureFilter = MAINFILTER.find(f => (f[0] === this.separationAttr));
        const featureIndex = MAINFILTER.indexOf(featureFilter);
        
        if (featureIndex === -1) {
            MAINFILTER.push([this.separationAttr, [newFilter]]); 

        } else {
            let selectedFilter = MAINFILTER[featureIndex];
            let specificnewFilter = selectedFilter[1].find(s => (s === newFilter));
            const selectedFilterIndex = selectedFilter[1].indexOf(specificnewFilter);
            
            if (selectedFilterIndex > -1) {
                if (selectedFilter[1].length === 1) {
                    MAINFILTER.splice(featureIndex, 1); 
                } else {
                    selectedFilter[1].splice(selectedFilterIndex, 1); 
                }
            } else { 
                selectedFilter[1].push(newFilter); 
            }
        }
        dataFilter(); 
    }
}
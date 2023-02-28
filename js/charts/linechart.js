class LineChart {

    /**
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _col, _header, _xL, _yL, _xLH = 20) {
        this.config = {
            parentElement: _config.parentElement,
            contextHeight: 30,
            margin: {top: 30, right: 10, bottom: 100, left: 75},
            contextMargin: {top: 253, right: 10, bottom: 30, left: 45},
            width:  545,
            height: 170,
            title: _header,
            xLabel: _xL,
            yLabel: _yL,
            XAxisLabelHeight: _xLH
        }

        this.data = _data;
        this.aggregateAttr = _col;
        
        this.initVis();
    }
    
    initVis() {
        let vis = this;

        const containerWidth = vis.config.width + vis.config.margin.left + vis.config.margin.right;
        const containerHeight = vis.config.height + vis.config.margin.top + vis.config.margin.bottom;

        vis.xScaleFocus = d3.scaleTime()
            .range([0, vis.config.width]);

        vis.xScaleContext = d3.scaleTime()
            .range([0, vis.config.width]);

        vis.yScaleFocus = d3.scaleLinear()
            .range([vis.config.height, 0])
            .nice();

        vis.yScaleContext = d3.scaleLinear()
            .range([vis.config.contextHeight, 0])
            .nice();

        // Initialize axes
        vis.xAxisFocus = d3.axisBottom(vis.xScaleFocus).tickSizeOuter(0);
        vis.xAxisContext = d3.axisBottom(vis.xScaleContext).tickSizeOuter(0);
        vis.yAxisFocus = d3.axisLeft(vis.yScaleFocus);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        // Header
        vis.svg.append("text")
            .attr("x", vis.config.width / 2 + vis.config.margin.left)
            .attr("y", 25)
            .attr("text-anchor", "middle")
            .style("font-size", "24px")
            .text(vis.config.title);

        // Y
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(vis.config.height / 2 + vis.config.margin.top))
            .attr("y", 30)
            .style("text-anchor", "middle")
            .text(vis.config.yLabel);

        // X
        vis.svg.append("text")
            .attr("transform", "translate(" + (vis.config.width / 2 + vis.config.margin.left) + " ," + (vis.config.height + 65) + ")")
            .style("text-anchor", "middle")
            .text(vis.config.xLabel);

        vis.focus = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.focus.append('defs').append('clipPath')
            .attr('id', 'clip')
            .append('rect')
            .attr('width', vis.config.width)
            .attr('height', vis.config.height);
        
        vis.focusLinePath = vis.focus.append('path')
            .attr('class', 'chart-line');

        vis.xAxisFocusG = vis.focus.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.config.height})`);

        vis.yAxisFocusG = vis.focus.append('g')
            .attr('class', 'axis y-axis');

        vis.tooltipTrackingArea = vis.focus.append('rect')
            .attr('width', vis.config.width)
            .attr('height', vis.config.height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all');

        // Empty tooltip group (hidden by default)
        vis.tooltip = vis.focus.append('g')
            .attr('class', 'tooltip')
            .style('display', 'none');

        vis.tooltip.append('circle')
            .attr('r', 4);

        vis.tooltip.append('text');

        // Append context group with x- and y-axes
        vis.context = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.contextMargin.left},${vis.config.contextMargin.top})`);

        vis.contextAreaPath =vis.context.append('path')
            .attr('class', 'chart-area')
            .attr('transform', `translate(30,0)`);

        vis.xAxisContextG = vis.context.append('g')
            .attr('class', 'axis x-axis' )
            .attr('transform', `translate(30,${vis.config.contextHeight})`);

        vis.brushG = vis.context.append('g')
            .attr('class', 'brush x-brush')
            .attr('transform',  `translate(30,0)`);

        vis.brush = d3.brushX()
            .extent([[0, 0], [vis.config.width, vis.config.contextHeight]])
            .on('brush', function({selection}) {
            if (selection) vis.brushed(selection);
            })
            .on('end', function({selection}) {

                if (!selection) {
                    vis.brushed(null, true)
                } else {
                    vis.brushed(selection, true)
                };
            });

        const defaultBrushSelection = [0, 0];
        vis.brushG
            .call(vis.brush)
            .call(vis.brush.move, defaultBrushSelection);
    }

    compare(a, b) {
        if (a.key < b.key){
            return 1;
        }
        if (a.key > b.key){
            return -1;
        }
        return 0;
    }
  
    /**
     * Prepare the data and scales before we render it.
     */
    updateVis(resetBrush = false) {
        let vis = this;
        const aggregatedDataMap = d3.rollups(vis.data, v => d3.sum(v, d => !d.filtered), d => d[this.aggregateAttr]);
        vis.aggregatedData = Array.from(aggregatedDataMap, ([key, count]) => ({ key, count }));
        vis.aggregatedData.sort(this.compare);

        let parseTime = d3.timeParse("%Y");
        vis.aggregatedData.forEach(function(d) {
            d.key = parseTime(d.key);
        });

        vis.xValue = d => d.key;
        vis.yValue = d => d.count;

        vis.line = d3.line()
            .x(d => vis.xScaleFocus(vis.xValue(d)))
            .y(d => vis.yScaleFocus(vis.yValue(d)));

        vis.area = d3.area()
            .x(d => vis.xScaleContext(vis.xValue(d)))
            .y1(d => vis.yScaleContext(vis.yValue(d)))
            .y0(vis.config.contextHeight);

        vis.xScaleFocus.domain(d3.extent(vis.aggregatedData, vis.xValue));
        vis.yScaleFocus.domain([0, d3.max(vis.aggregatedData, vis.yValue)]);
        vis.xScaleContext.domain(vis.xScaleFocus.domain());
        vis.yScaleContext.domain(vis.yScaleFocus.domain());

        vis.bisectPos = d3.bisector(vis.xValue).right;

        if(resetBrush){
            vis.brushed(null, true)
            vis.context.selectAll(".selection").attr('width', 0);
        }

        vis.renderVis();
    }
  
    /**
     * This function contains the D3 code for binding data to visual elements
     */
    renderVis() {
      let vis = this;
  
      vis.focusLinePath
          .datum(vis.aggregatedData)
          .attr('d', vis.line);
  
      vis.contextAreaPath
          .datum(vis.aggregatedData)
          .attr('d', vis.area);
  
      vis.tooltipTrackingArea
          .on('mouseenter', () => {
            vis.tooltip.style('display', 'block');
          })
          .on('mouseleave', () => {
            vis.tooltip.style('display', 'none');
          })
          .on('mousemove', function(event) {
            // Get date that corresponds to current mouse x-coordinate
            const xPos = d3.pointer(event, this)[0]; // First array element is x, second is y
            let date = new Date(vis.xScaleFocus.invert(xPos))
            date = date.getFullYear()

            // Find nearest data point
            const index = vis.bisectPos(vis.aggregatedData, date, vis.aggregatedData.findIndex(i => i.key.getFullYear() === date) + 1);
            let a = vis.aggregatedData[index - 1]
            if (a === undefined){
                a = vis.aggregatedData[index];
            }
            const b = vis.aggregatedData[index];
            const d = b && (date - a.key > b.key - date) ? b : a; 
  
            // Update tooltip
            vis.tooltip.select('circle')
                .attr('transform', `translate(${vis.xScaleFocus(d.key)},${vis.yScaleFocus(d.count)})`);
            
            vis.tooltip.select('text')
                .attr('transform', `translate(${vis.xScaleFocus(d.key)},${(vis.yScaleFocus(d.count) - 15)})`)
                .style('user-select', 'none')
                .text(Math.round(d.count));
          });
      
      vis.xAxisFocusG.call(vis.xAxisFocus);
      vis.yAxisFocusG.call(vis.yAxisFocus);
      vis.xAxisContextG.call(vis.xAxisContext);

    }
  
    /**
     * React to brush events
     */
    brushed(selection, isEnd = false) {
      let vis = this;
  
      if (selection) {
        const selectedDomain = selection.map(vis.xScaleContext.invert, vis.xScaleContext);

        let d1 = new Date(selectedDomain[0]).getFullYear();
        let d2 = new Date(selectedDomain[1]).getFullYear();

        this.toggleFilter(d1, d2, isEnd);

        vis.xScaleFocus.domain(selectedDomain);

      } else {

            this.toggleFilter(1992, 2023, isEnd);
            vis.xScaleFocus.domain(vis.xScaleContext.domain());
      }
  
      vis.focusLinePath.attr('d', vis.line);
      vis.xAxisFocusG.call(vis.xAxisFocus);

    }

    toggleFilter(startYear, endYear, isEnd = false){
        if (isEnd) {
            let featureFilter = MAINFILTER.find(f => (f[0] === "disc_year"))
            const featureIndex = MAINFILTER.indexOf(featureFilter);

            MAINFILTER[featureIndex][1] = [startYear, endYear];

            dataFilter(); 
        }
      }
  }
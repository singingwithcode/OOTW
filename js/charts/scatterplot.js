class Scatterplot {
  /**
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _xAttr, _yAttr, _header, _xL, _yL, _xLH = 20) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 600,
        containerHeight: _config.containerHeight || 304,
        margin: _config.margin || {top: 30, right: 30, bottom: 20, left: 50},
        title: _header,
        xLabel: _xL,
        yLabel: _yL,
        XAxisLabelHeight: _xLH
      }

      this.xAttr = _xAttr;
      this.yAttr = _yAttr;
      this.data = _data;
      this.prevSelected = [];
      this.initVis();

  }

  initVis() {
    let vis = this;
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right - 20;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom - vis.config.XAxisLabelHeight;

    // Initialize scales and axes
    // Important: we flip array elements in the y output range to position the rectangles correctly
    vis.yScale = d3.scaleLog()
        .range([vis.height, 0]);

    vis.xScale = d3.scaleLog()
        .range([0, vis.width]);

    // Initialize axes
    vis.xAxis = d3.axisBottom(vis.xScale);

    vis.yAxis = d3.axisLeft(vis.yScale);

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement)
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left + 20},${vis.config.margin.top})`);

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chart.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0,${vis.height})`);

    // Append y-axis group
    vis.yAxisG = vis.chart.append('g')
        .attr('class', 'axis y-axis');

    // Header
    vis.svg.append("text")
      .attr("x", vis.width / 2)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .style("font-size", "24px")
      .text(vis.config.title);

    // Y
    vis.svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -vis.config.containerHeight + 160)
      .attr("y", 25)
      .style("text-anchor", "middle")
      .text(vis.config.yLabel);

    // X
    vis.svg.append("text")
      .attr("transform", "translate(" + (vis.width / 2) + " ," + (vis.height + 65) + ")")
      .style("text-anchor", "middle")
      .text(vis.config.xLabel);

    vis.brushG = vis.chart.append('g')
      .attr('class', 'brush x-brush')
      .attr('transform', `translate(0,0)`);

    vis.brush = d3.brush()
      .extent([[0, 0], [vis.width, vis.height - 2]])
      .on('brush', function({selection}) {
        if (selection) vis.brushed(selection);
      })
      .on('end', function({selection}) {
        if (!selection){
          vis.brushed(null, true)
        } else {
          vis.brushed(selection, true)
        };
      });

    vis.xValue = d => d[vis.xAttr];
    vis.yValue = d => d[vis.yAttr];
  }

  updateVis(resetBrush = false) {
    let vis = this;

    vis.data = vis.data.map(d => ({...d, color: "#A387F9"})).filter(d => !isNaN(d.pl_bmasse) && !isNaN(d.pl_rade)).concat(solarSys)
    
    // Set the scale input domains
    vis.xScale.domain(d3.extent(data, vis.xValue));
    vis.yScale.domain(d3.extent(data, vis.yValue));

    // Add dots
    const circles = vis.chart.join('g').selectAll("circle")
      .data(vis.data)
      .join("circle")
      .attr("cx", d => vis.xScale(vis.xValue(d)))
      .attr("cy", d => vis.yScale(vis.yValue(d)))
      .attr("r", 3)
      .attr("opacity", d => {
        if(d.filtered === true){
          return 0;
        } else {
          return 1;
        }
      })
      .style("fill", d => d.color);

    // Labels for planets in our solar system
    vis.chart.append('g')
      .selectAll(".solarSystemLabel")
      .data(vis.data.filter(d => solarSys.includes(d)))
      .join("text")
      .attr("class", "solarSystemLabel")
      .attr("x", function (d) { return vis.xScale(vis.xValue(d)) + 5 + d.labelXOffset; } )
      .attr("y", function (d) { return vis.yScale(vis.yValue(d)) + 10 + d.labelYOffset; } )
      .attr("font-weight", 600)
      .text(d => d.pl_name);

    circles
        .on('mouseover', (event, d) => {
          d3.select('#tooltip')
          .style('display', 'block')
          .style('left', (event.pageX - 65) + 'px')   
          .style('top', (event.pageY + 15) + 'px')
          .html(`
              <div class="tooltip-title">${d.pl_name}</div>
              <ul>
              <li>Radius (Earth): ${d.pl_rade}</li>
              <li>Mass (Earth): ${d.pl_bmasse}</li>
              </ul>
            `);
          })
          .on('mouseleave', () => {
            d3.select('#tooltip').style('display', 'none');
          });

    circles.on('click', (event, exoplanet) => {
      if(!solarSys.includes(exoplanet)){
        openSys(exoplanet);
      }
    })
    
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);

    if(resetBrush){
      // Update the brush and define a default position
      vis.brushG.selectAll(".selection").attr('width', 0).attr('height', 0);
    }else{
      vis.brushG
      .call(vis.brush)
      .call(vis.brush.move, vis.brushExtent);
    }
  }

  /**
     * React to brush events
  */
  brushed(selection, isEnd = false) {

    let vis = this;
    let selected = [];
    vis.brushExtent = selection;

    vis.chart.selectAll("circle")
      .style('fill', function(d) {
        let x = vis.xScale(vis.xValue(d));
        let y = vis.yScale(vis.yValue(d));
        if(vis.brushExtent !== null &&
          !solarSys.includes(d) &&

          x >= vis.brushExtent[0][0] &&
          x <= vis.brushExtent[1][0] &&
          y >= vis.brushExtent[0][1] &&
          y <= vis.brushExtent[1][1]) {
            selected.push(d.pl_name);
            return d.color;
          } else {
            return d.color;
          }
      });
    if (isEnd && JSON.stringify(vis.prevSelected) !== JSON.stringify(selected)) {
      this.toggleFilter(selected);
    }
  }

  toggleFilter(selectedNames) {

    let vis = this;

    vis.prevSelected = selectedNames;

    let featureFilter = MAINFILTER.find(f => (f[0] === "pl_name"));
    const featureIndex = MAINFILTER.indexOf(featureFilter);
    
    MAINFILTER[featureIndex][1] = selectedNames;

    dataFilter(); 
  }
}
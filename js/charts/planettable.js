class PlanetTable {

    /**
     * @param {Object}
     * @param {Array}
     */
    constructor(_parentElement, _data, _cols) {
        this.parentElement = _parentElement;
        this.data = _data;
        this.columns = _cols;
        this.initVis();

    }

    initVis() {

        let vis = this;
        let table = d3.select(vis.parentElement).append('table');
        let thead = table.append('thead');
        let	tbody = table.append('tbody');

        table.append('colgroup')
            .selectAll('col')
            .data(vis.columns).enter()
            .append('col')
            .attr('span', 1)
            .style('width', '7%');

        thead.append('tr')
            .selectAll('th')
            .data(vis.columns).enter()
            .append('th')
            .text(function (column) { return column[1]; });

        let rows = tbody.selectAll('tr')
            .data(vis.data)
            .enter()
            .append('tr').on('click', (e, exoplanet) => {
                console.log(exoplanet);
                if(!solarSys.includes(exoplanet)){
                  openSys(exoplanet);
                }
            });

        // create a cell in each row for each column
        let cells = rows.selectAll('td')
            .data(function (row) {

            return vis.columns.map(function (column) {
                return {column: column, value: row[column[0]]};
            });
            })
            .enter()
            .append('td')
            .text(function (d) { return d.value;});
    }

    updateVis() {

        let vis = this;
        vis.data = vis.data.filter(d => d.filtered ===false);

        vis.renderVis();
    }

    renderVis() {

        let vis = this;

        let table = d3.select(vis.parentElement).join('table').selectAll("table");
        let thead = table.join('thead');
        let	tbody = table.join('tbody');

        // append the columns configs
        table.join('colgroup')
            .selectAll('col')
            .data(vis.columns).enter()
            .join('col')
            .attr('span', 1)
            .style('width', '7%');

        // append the header row
        thead.join('tr')
            .selectAll('th')
            .data(vis.columns)
            .join('th')
            .text(function (column) { return column[1]; });


    }
}
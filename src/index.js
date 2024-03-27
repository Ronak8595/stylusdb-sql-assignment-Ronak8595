const parseQuery = require('./queryParser');
const readCSV = require('./csvReader');

async function executeSELECTQuery(query) {
    const { fields, table, whereClause } = parseQuery(query);
    const data = await readCSV(`${table}.csv`);
    
    // Filtering based on WHERE clause (case insensitive)
    const filteredData = whereClause
        ? data.filter(row => {
            const [field, value] = whereClause.split('=').map(s => s.trim());
            return row[field].toLowerCase() === value.toLowerCase();
        })
        : data;

    // Selecting the specified fields
    return filteredData.map(row => {
        const selectedRow = {};
        fields.forEach(field => {
            selectedRow[field] = row[field];
        });
        return selectedRow;
    });
}

module.exports = executeSELECTQuery;

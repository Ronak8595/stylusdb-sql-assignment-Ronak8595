// src/queryParser.js

function parseJoinClause(query) {
    const joinRegex = /\s(INNER|LEFT|RIGHT) JOIN\s(.+?)\sON\s([\w.]+)\s*=\s*([\w.]+)/i;
    const joinMatch = query.match(joinRegex);

    if (joinMatch) {
        return {
            joinType: joinMatch[1].trim(),
            joinTable: joinMatch[2].trim(),
            joinCondition: {
                left: joinMatch[3].trim(),
                right: joinMatch[4].trim()
            }
        };
    }

    return {
        joinType: null,
        joinTable: null,
        joinCondition: null
    };
}

function parseQuery(query) {
    // First, let's trim the query to remove any leading/trailing whitespaces
    query = query.trim();

    // Initialize variables for different parts of the query
    let selectPart, fromPart;

    // Updated regex to capture LIMIT clause and remove it for further processing
    const limitRegex = /\sLIMIT\s(\d+)/i;
    const limitMatch = query.match(limitRegex);

    let limit = null;
    if (limitMatch) {
        limit = parseInt(limitMatch[1], 10);
        query = query.replace(limitRegex, ''); // Remove LIMIT clause
    }

    // Process ORDER BY clause and remove it for further processing
    const orderByRegex = /\sORDER BY\s(.+)/i;
    const orderByMatch = query.match(orderByRegex);
    let orderByFields = null;
    if (orderByMatch) {
        orderByFields = orderByMatch[1].split(',').map(field => {
            const [fieldName, order] = field.trim().split(/\s+/);
            return { fieldName, order: order ? order.toUpperCase() : 'ASC' };
        });
        query = query.replace(orderByRegex, '');
    }

    // Updated regex to capture GROUP BY clause
    const groupByRegex = /\sGROUP BY\s(.+)/i;
    const groupByMatch = query.match(groupByRegex);

    let groupByFields = null;
    if (groupByMatch) {
        groupByFields = groupByMatch[1].split(',').map(field => field.trim());
        query = query.replace(groupByRegex, '');
    }
    fromPart = query;
    // Split the query at the WHERE clause if it exists
    const whereSplit = query.split(/\sWHERE\s/i);
    query = whereSplit[0]; // Everything before WHERE clause

    // WHERE clause is the second part after splitting, if it exists
    const whereClause = whereSplit.length > 1 ? whereSplit[1].trim() : null;

    // Split the remaining query at the JOIN clause if it exists
    const joinSplit = query.split(/\s(INNER|LEFT|RIGHT) JOIN\s/i);
    selectPart = joinSplit[0].trim(); // Everything before JOIN clause

    // Extract JOIN information
    const { joinType, joinTable, joinCondition } = parseJoinClause(query);

    // Parse the SELECT part
    const selectRegex = /^SELECT\s(.+?)\sFROM\s(.+)/i;
    const selectMatch = selectPart.match(selectRegex);
    if (!selectMatch) {
        throw new Error('Invalid SELECT format');
    }

    let [, fields, table] = selectMatch;

    // Parse the WHERE part if it exists
    let whereClauses = [];
    if (whereClause) {
        whereClauses = parseWhereClause(whereClause);
    }

    // Check for aggregate functions without GROUP BY
    const hasAggregateWithoutGroupBy = checkAggregateWithoutGroupBy(fromPart, groupByFields);

    // Temporarily replace commas within parentheses to avoid incorrect splitting
    const tempPlaceholder = '__TEMP_COMMA__'; // Ensure this placeholder doesn't appear in your actual queries
    fields = fields.replace(/\(([^)]+)\)/g, (match) => match.replace(/,/g, tempPlaceholder));

    // Now split fields and restore any temporary placeholders
    const parsedFields = fields.split(',').map(field =>
        field.trim().replace(new RegExp(tempPlaceholder, 'g'), ','));

    return {
        fields: parsedFields,
        table: table.trim(),
        whereClauses,
        joinTable,
        joinCondition,
        joinType,
        groupByFields,
        hasAggregateWithoutGroupBy,
        orderByFields,
        limit
    };
}

function checkAggregateWithoutGroupBy(query, groupByFields) {
    const aggregateFunctionRegex = /(\bCOUNT\b|\bAVG\b|\bSUM\b|\bMIN\b|\bMAX\b)\s*\(\s*(\*|\w+)\s*\)/i;
    return aggregateFunctionRegex.test(query) && !groupByFields;
}

function parseWhereClause(whereString) {
    const conditionRegex = /(.*?)(=|!=|>|<|>=|<=)(.*)/;
    return whereString.split(/ AND | OR /i).map(conditionString => {
        const match = conditionString.match(conditionRegex);
        if (match) {
            const [, field, operator, value] = match;
            return { field: field.trim(), operator, value: value.trim() };
        }
        throw new Error('Invalid WHERE clause format');
    });
}

module.exports = { parseQuery, parseJoinClause };
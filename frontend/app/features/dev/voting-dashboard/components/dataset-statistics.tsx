import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { useDatasetStatsQuery } from '../hooks/use-dataset-stats';

interface SummaryItem {
  count: number;
  unique: number;
  top: string;
  freq: number;
}

interface SummaryData {
  [key: string]: SummaryItem;
}

// Component to display the summary table Part 1
function SummaryTable({ summary }: { summary: SummaryData }) {
  const attributes = Object.keys(summary);

  return (
    <TableContainer component={Paper} sx={{ mt: 3 }}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell sx={{ fontWeight: 600 }}>Metric</TableCell>
            {attributes.map((attr) => (
              <TableCell
                key={attr}
                align="center"
                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
              >
                {attr}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
            <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
              Count
            </TableCell>
            {attributes.map((attr) => (
              <TableCell key={attr} align="center">
                {summary[attr].count}
              </TableCell>
            ))}
          </TableRow>
          <TableRow sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
            <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
              Unique
            </TableCell>
            {attributes.map((attr) => (
              <TableCell key={attr} align="center">
                {summary[attr].unique}
              </TableCell>
            ))}
          </TableRow>
          <TableRow sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
            <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
              Most Common
            </TableCell>
            {attributes.map((attr) => (
              <TableCell key={attr} align="center">
                <Typography
                  variant="body2"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                  }}
                >
                  {summary[attr].top}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
          <TableRow sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
            <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
              Frequency
            </TableCell>
            {attributes.map((attr) => (
              <TableCell key={attr} align="center">
                {summary[attr].freq}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Part 2 - Attribute Distribution Charts
interface AttributeDistributions {
  [attribute: string]: {
    value: { [key: string]: string };
    dataset: { [key: string]: number };
    'MC sampling': { [key: string]: number };
    settings: { [key: string]: number };
  };
}

function AttributeDistribution({
  distributions,
  attributeOrder,
}: {
  distributions: AttributeDistributions;
  attributeOrder: string[];
}) {
  // Default to second attribute (ethnicity) as specified
  const [selectedAttribute, setSelectedAttribute] = useState(
    attributeOrder[1] || Object.keys(distributions)[0],
  );

  const attributeData = distributions[selectedAttribute];
  if (!attributeData) return null;

  // Get the values in order
  const indices = Object.keys(attributeData.value).sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  const labels = indices.map((idx) => attributeData.value[idx]);

  // Prepare data for the chart
  const chartData = indices.map((idx, i) => ({
    label: labels[i],
    Dataset: (attributeData.dataset[idx] || 0) * 100,
    'MC Sampling': (attributeData['MC sampling'][idx] || 0) * 100,
    Settings: (attributeData.settings[idx] || 0) * 100,
  }));

  // Calculate dynamic width based on number of items
  const barWidth = 60;
  const groupWidth = barWidth * 3 + 20;
  const groupSpacing = 30;
  const chartWidth = Math.max(
    800,
    chartData.length * (groupWidth + groupSpacing) + 100,
  );

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Typography variant="h6">Attribute Distribution</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Attribute</InputLabel>
          <Select
            value={selectedAttribute}
            label="Attribute"
            onChange={(e) => setSelectedAttribute(e.target.value)}
          >
            {attributeOrder.map((attr) => (
              <MenuItem
                key={attr}
                value={attr}
                sx={{ textTransform: 'capitalize' }}
              >
                {attr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper sx={{ p: 3, overflow: 'auto' }}>
        <Box sx={{ width: chartWidth, height: 400, position: 'relative' }}>
          <svg width={chartWidth} height="100%" style={{ overflow: 'visible' }}>
            {/* Chart rendering */}
            <g transform="translate(80, 20)">
              {/* Y-axis */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="320"
                stroke="#666"
                strokeWidth="2"
              />

              {/* Y-axis labels */}
              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={tick}>
                  <line
                    x1="-5"
                    y1={320 - (tick / 100) * 320}
                    x2="0"
                    y2={320 - (tick / 100) * 320}
                    stroke="#666"
                    strokeWidth="1"
                  />
                  <text
                    x="-10"
                    y={320 - (tick / 100) * 320 + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#666"
                  >
                    {tick}%
                  </text>
                </g>
              ))}

              {/* Grid lines */}
              {[25, 50, 75].map((tick) => (
                <line
                  key={`grid-${tick}`}
                  x1="0"
                  y1={320 - (tick / 100) * 320}
                  x2={chartWidth - 100}
                  y2={320 - (tick / 100) * 320}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              ))}

              {/* Bars */}
              {chartData.map((item, index) => {
                const x = index * (groupWidth + groupSpacing);

                return (
                  <g key={index}>
                    {/* Dataset bar */}
                    <rect
                      x={x}
                      y={320 - (item.Dataset / 100) * 320}
                      width={barWidth}
                      height={(item.Dataset / 100) * 320}
                      fill="#906B4D"
                      opacity="0.8"
                    />
                    {/* MC Sampling bar */}
                    <rect
                      x={x + barWidth + 5}
                      y={320 - (item['MC Sampling'] / 100) * 320}
                      width={barWidth}
                      height={(item['MC Sampling'] / 100) * 320}
                      fill="#1976d2"
                      opacity="0.8"
                    />
                    {/* Settings bar */}
                    <rect
                      x={x + (barWidth + 5) * 2}
                      y={320 - (item.Settings / 100) * 320}
                      width={barWidth}
                      height={(item.Settings / 100) * 320}
                      fill="#4caf50"
                      opacity="0.8"
                    />

                    {/* Label */}
                    <text
                      x={x + groupWidth / 2}
                      y="340"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#666"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {item.label === 'None'
                        ? 'None'
                        : item.label.length > 10
                          ? item.label.substring(0, 10) + '...'
                          : item.label}
                    </text>
                  </g>
                );
              })}

              {/* Legend */}
              <g transform={`translate(0, 360)`}>
                <rect
                  x="0"
                  y="0"
                  width="15"
                  height="15"
                  fill="#906B4D"
                  opacity="0.8"
                />
                <text x="20" y="12" fontSize="12" fill="#666">
                  Dataset
                </text>
                <rect
                  x="100"
                  y="0"
                  width="15"
                  height="15"
                  fill="#1976d2"
                  opacity="0.8"
                />
                <text x="120" y="12" fontSize="12" fill="#666">
                  MC Sampling
                </text>
                <rect
                  x="230"
                  y="0"
                  width="15"
                  height="15"
                  fill="#4caf50"
                  opacity="0.8"
                />
                <text x="250" y="12" fontSize="12" fill="#666">
                  Settings
                </text>
              </g>
            </g>
          </svg>
        </Box>
        {chartData.length > 8 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            Scroll horizontally to view all values
          </Typography>
        )}
      </Paper>
    </Box>
  );
}

// Part 3 - Pairwise Attribute Analysis
interface PairwiseData {
  crosstab_dataset: { [key: string]: { [key: string]: number } };
  crosstab_mc: { [key: string]: { [key: string]: number } };
  mututal_information: number;
}

function PairwiseAttributeAnalysis({
  pairwiseAttributes,
  attributeOrder,
  // parameterSet,
}: {
  pairwiseAttributes: (PairwiseData | null)[][];
  attributeOrder: string[];
  parameterSet: any;
}) {
  const [attribute1, setAttribute1] = useState<string>('');
  const [attribute2, setAttribute2] = useState<string>('');

  // Get available attributes for second dropdown based on first selection
  const getAvailableAttributes2 = () => {
    if (!attribute1) return [];
    return attributeOrder.filter((attr) => attr !== attribute1);
  };

  // Get pairwise data
  const getPairwiseData = (): PairwiseData | null => {
    if (!attribute1 || !attribute2) return null;

    const idx1 = attributeOrder.indexOf(attribute1);
    const idx2 = attributeOrder.indexOf(attribute2);

    if (idx1 === -1 || idx2 === -1) return null;

    return pairwiseAttributes[idx1]?.[idx2] || null;
  };

  const pairwiseData = getPairwiseData();

  // Render heatmap
  const renderHeatmap = (
    crosstab: { [key: string]: { [key: string]: number } },
    title: string,
  ) => {
    if (!crosstab) return null;

    const rowKeys = Object.keys(crosstab).sort();
    const colKeys =
      rowKeys.length > 0 ? Object.keys(crosstab[rowKeys[0]]).sort() : [];

    if (rowKeys.length === 0 || colKeys.length === 0) return null;

    // Get all values to calculate color scale
    const allValues = rowKeys.flatMap((row) =>
      colKeys.map((col) => crosstab[row]?.[col] || 0),
    );
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);

    const cellSize = 60;
    const labelWidth = 150;
    const labelHeight = 120;
    const legendHeight = 60;
    const width = labelWidth + colKeys.length * cellSize + 20;
    const height = labelHeight + rowKeys.length * cellSize + legendHeight;

    // Color scale function
    const getColor = (value: number) => {
      if (maxValue === minValue) return '#e3f2fd';
      const intensity = (value - minValue) / (maxValue - minValue);
      const r = Math.floor(227 + (25 - 227) * intensity);
      const g = Math.floor(242 + (118 - 242) * intensity);
      const b = Math.floor(253 + (210 - 253) * intensity);
      return `rgb(${r}, ${g}, ${b})`;
    };

    return (
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Box sx={{ overflow: 'auto', maxWidth: '100%', maxHeight: 600 }}>
          <svg width={width} height={height}>
            {/* Column labels */}
            {colKeys.map((col, colIdx) => (
              <text
                key={`col-${colIdx}`}
                x={labelWidth + colIdx * cellSize + cellSize / 2}
                y={labelHeight - 15}
                textAnchor="start"
                fontSize="10"
                fill="#666"
                transform={`rotate(-45, ${labelWidth + colIdx * cellSize + cellSize / 2}, ${labelHeight - 15})`}
                style={{ textTransform: 'capitalize' }}
              >
                {col.length > 12 ? col.substring(0, 12) + '...' : col}
              </text>
            ))}

            {/* Row labels and cells */}
            {rowKeys.map((row, rowIdx) => (
              <g key={`row-${rowIdx}`}>
                {/* Row label */}
                <text
                  x={labelWidth - 10}
                  y={labelHeight + rowIdx * cellSize + cellSize / 2 + 5}
                  textAnchor="end"
                  fontSize="10"
                  fill="#666"
                  style={{ textTransform: 'capitalize' }}
                >
                  {row.length > 18 ? row.substring(0, 18) + '...' : row}
                </text>

                {/* Cells */}
                {colKeys.map((col, colIdx) => {
                  const value = crosstab[row]?.[col] || 0;
                  return (
                    <g key={`cell-${rowIdx}-${colIdx}`}>
                      <rect
                        x={labelWidth + colIdx * cellSize}
                        y={labelHeight + rowIdx * cellSize}
                        width={cellSize}
                        height={cellSize}
                        fill={getColor(value)}
                        stroke="#fff"
                        strokeWidth="1"
                      />
                      <text
                        x={labelWidth + colIdx * cellSize + cellSize / 2}
                        y={labelHeight + rowIdx * cellSize + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#333"
                        fontWeight="500"
                      >
                        {value.toFixed(2)}
                      </text>
                    </g>
                  );
                })}
              </g>
            ))}

            {/* Color scale legend */}
            <g
              transform={`translate(${labelWidth}, ${labelHeight + rowKeys.length * cellSize + 20})`}
            >
              <text x="0" y="5" fontSize="11" fill="#666" fontWeight="500">
                Scale:
              </text>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const value = minValue + ratio * (maxValue - minValue);
                return (
                  <g key={idx} transform={`translate(${50 + idx * 70}, 0)`}>
                    <rect
                      x="0"
                      y="-8"
                      width="18"
                      height="18"
                      fill={getColor(value)}
                      stroke="#666"
                      strokeWidth="0.5"
                    />
                    <text x="23" y="5" fontSize="10" fill="#666">
                      {value.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </Box>
      </Box>
    );
  };

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Pairwise Attribute Analysis
      </Typography>

      <Box display="flex" gap={2} mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>First Attribute</InputLabel>
          <Select
            value={attribute1}
            label="First Attribute"
            onChange={(e) => {
              setAttribute1(e.target.value);
              // Reset second attribute if it's the same as first
              if (attribute2 === e.target.value) {
                setAttribute2('');
              }
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {attributeOrder.map((attr) => (
              <MenuItem
                key={attr}
                value={attr}
                sx={{ textTransform: 'capitalize' }}
              >
                {attr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} disabled={!attribute1}>
          <InputLabel>Second Attribute</InputLabel>
          <Select
            value={attribute2}
            label="Second Attribute"
            onChange={(e) => setAttribute2(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {getAvailableAttributes2().map((attr) => (
              <MenuItem
                key={attr}
                value={attr}
                sx={{ textTransform: 'capitalize' }}
              >
                {attr}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {!attribute1 || !attribute2 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Select two different attributes to view their pairwise analysis
          </Typography>
        </Paper>
      ) : !pairwiseData ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No pairwise data available for the selected attributes
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Box
            display="grid"
            gridTemplateColumns={{ xs: '1fr', lg: '1fr 1fr' }}
            gap={4}
          >
            <Box>
              {renderHeatmap(pairwiseData.crosstab_dataset, 'Dataset Crosstab')}
            </Box>
            <Box>
              {renderHeatmap(pairwiseData.crosstab_mc, 'MC Sampling Crosstab')}
            </Box>
          </Box>

          <Box mt={4} textAlign="center">
            <Paper sx={{ p: 2, bgcolor: 'grey.50', display: 'inline-block' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Mutual Information
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                {pairwiseData.mututal_information.toFixed(4)}
              </Typography>
            </Paper>
          </Box>
        </Paper>
      )}
    </Box>
  );
}

//Part 4 - Dependancy Diagnostic values
interface DiversityScores {
  attribute: { [key: string]: string };
  entropy: { [key: string]: number };
  normalized: { [key: string]: number };
  simpson_diversity: { [key: string]: number };
  unique_values: { [key: string]: number };
}

function DiagnosticValues({
  diversityScores,
}: {
  diversityScores: DiversityScores;
}) {
  if (!diversityScores) return null;

  const indices = Object.keys(diversityScores.attribute).sort(
    (a, b) => parseInt(a) - parseInt(b),
  );

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Attribute Diversity Scores
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 600 }}>Attribute</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Entropy
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Normalized
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Simpson Diversity
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Unique Values
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indices.map((idx) => (
              <TableRow key={idx} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                >
                  {diversityScores.attribute[idx]}
                </TableCell>
                <TableCell align="right">
                  {diversityScores.entropy[idx].toFixed(4)}
                </TableCell>
                <TableCell align="right">
                  {diversityScores.normalized[idx].toFixed(4)}
                </TableCell>
                <TableCell align="right">
                  {diversityScores.simpson_diversity[idx].toFixed(4)}
                </TableCell>
                <TableCell align="right">
                  {diversityScores.unique_values[idx]}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// Part 5 - Sampling Variance Analysis
interface DifferenceCounts {
  diff_counts: { [key: string]: number };
  total_pairs: number;
  average_difference: number;
}

function DifferenceDistribution({
  differenceCounts,
}: {
  differenceCounts: DifferenceCounts;
}) {
  if (!differenceCounts) return null;

  // Prepare data for the chart
  const diffKeys = Object.keys(differenceCounts.diff_counts).sort(
    (a, b) => parseInt(a) - parseInt(b),
  );
  const chartData = diffKeys.map((key) => ({
    differences: parseInt(key),
    count: differenceCounts.diff_counts[key],
  }));

  const maxCount = Math.max(...chartData.map((d) => d.count));
  const barWidth = 50;
  const chartWidth = Math.max(800, chartData.length * (barWidth + 10) + 100);

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        Sampling ID Variance
      </Typography>

      <Box display="flex" gap={3} mb={2}>
        <Paper sx={{ p: 2, bgcolor: 'grey.50', flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Pairs
          </Typography>
          <Typography variant="h6" color="primary">
            {differenceCounts.total_pairs.toLocaleString()}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, bgcolor: 'grey.50', flex: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Average Difference
          </Typography>
          <Typography variant="h6" color="primary">
            {differenceCounts.average_difference.toFixed(2)}
          </Typography>
        </Paper>
      </Box>

      <Paper sx={{ p: 3, overflow: 'auto' }}>
        <Box sx={{ width: chartWidth, height: 400, position: 'relative' }}>
          <svg width={chartWidth} height="100%">
            <g transform="translate(60, 20)">
              {/* Y-axis */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="320"
                stroke="#666"
                strokeWidth="2"
              />

              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const value = Math.floor(maxCount * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1="-5"
                      y1={320 - ratio * 320}
                      x2="0"
                      y2={320 - ratio * 320}
                      stroke="#666"
                      strokeWidth="1"
                    />
                    <text
                      x="-10"
                      y={320 - ratio * 320 + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="#666"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* X-axis */}
              <line
                x1="0"
                y1="320"
                x2={chartWidth - 80}
                y2="320"
                stroke="#666"
                strokeWidth="2"
              />

              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={`grid-${ratio}`}
                  x1="0"
                  y1={320 - ratio * 320}
                  x2={chartWidth - 80}
                  y2={320 - ratio * 320}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
              ))}

              {/* Bars */}
              {chartData.map((item, index) => {
                const x = index * (barWidth + 10);
                const barHeight = (item.count / maxCount) * 320;

                return (
                  <g key={index}>
                    <rect
                      x={x + 5}
                      y={320 - barHeight}
                      width={barWidth}
                      height={barHeight}
                      fill="#906B4D"
                      opacity="0.8"
                    />
                    <text
                      x={x + barWidth / 2 + 5}
                      y={320 - barHeight - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#666"
                    >
                      {item.count}
                    </text>
                    {/* X-axis label */}
                    <text
                      x={x + barWidth / 2 + 5}
                      y="340"
                      textAnchor="middle"
                      fontSize="11"
                      fill="#666"
                    >
                      {item.differences}
                    </text>
                  </g>
                );
              })}

              {/* Axis labels */}
              <text
                x={(chartWidth - 80) / 2}
                y="370"
                textAnchor="middle"
                fontSize="13"
                fill="#666"
                fontWeight="500"
              >
                Number of Differences
              </text>
              <text
                x="-160"
                y="-35"
                textAnchor="middle"
                fontSize="13"
                fill="#666"
                fontWeight="500"
                transform="rotate(-90)"
              >
                Count
              </text>
            </g>
          </svg>
        </Box>
      </Paper>
    </Box>
  );
}

function DatasetStatsDisplay({ data }: { data: any }) {
  if (!data || !data.summary) {
    return (
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        No summary data available
      </Typography>
    );
  }

  return (
    <Box mt={2}>
      <Typography variant="h6" gutterBottom>
        Dataset Summary
      </Typography>
      <SummaryTable summary={data.summary} />

      {data.attribute_distributions && data.attribute_order && (
        <AttributeDistribution
          distributions={data.attribute_distributions}
          attributeOrder={data.attribute_order}
        />
      )}

      {data.pairwise_attributes &&
        data.attribute_order &&
        data.parameter_set && (
          <PairwiseAttributeAnalysis
            pairwiseAttributes={data.pairwise_attributes}
            attributeOrder={data.attribute_order}
            parameterSet={data.parameter_set}
          />
        )}

      {data.attribute_diversity_scores && (
        <DiagnosticValues diversityScores={data.attribute_diversity_scores} />
      )}

      {data.difference_counts && (
        <DifferenceDistribution differenceCounts={data.difference_counts} />
      )}
    </Box>
  );
}

export default function DatasetStatistics() {
  const { data, isLoading, error, refetch } = useDatasetStatsQuery();

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <Box pt={2}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleRefresh}
        disabled={isLoading}
        startIcon={isLoading ? <CircularProgress size={20} /> : undefined}
      >
        {isLoading ? 'Fetching...' : 'Refresh Dataset Statistics'}
      </Button>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error:{' '}
          {error instanceof Error ? error.message : 'Failed to fetch data'}
        </Typography>
      )}

      {data && <DatasetStatsDisplay data={data} />}
    </Box>
  );
}

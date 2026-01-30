import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { useState } from 'react';

import DatasetStatistics from './components/dataset-statistics';
import VoteGeneralInfo from './components/vote-general-info';
import VotingOriginals from './components/voting-originals';
import VotingVariants from './components/voting-variants';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`voting-tabpanel-${index}`}
      aria-labelledby={`voting-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function VotingDashboard() {
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        📊 Voting Dashboard
      </Typography>

      <Paper sx={{ mt: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="voting dashboard tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '16px',
              fontWeight: 500,
              color: '#302f2f',
              '&.Mui-selected': {
                color: '#906B4D',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#906B4D',
            },
          }}
        >
          <Tab label="ℹ️ Vote General Info" />
          <Tab label="🖼️ Originals" />
          <Tab label="🎯 Voting Variants" />
          <Tab label="📊 Dataset Statistics" />
          <Tab label="📈 Vote Statistics" />
          <Tab label="⚙️ Settings" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Vote General Info
          </Typography>
          <Typography color="text.secondary">
            View voting trends, winner analysis, and statistical insights.
          </Typography>
          <VoteGeneralInfo />
          {/* Add vote statistics content here */}
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Originals
          </Typography>
          <Typography color="text.secondary">
            Upload, manage, and organize makeup look variants for A/B testing.
          </Typography>
          <VotingOriginals />
          {/* Add originals management content here */}
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Voting Variants
          </Typography>
          <Typography color="text.secondary">
            Monitor ongoing comparisons and view real-time voting results.
          </Typography>
          <VotingVariants />
          {/* Add voting variants content here */}
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Dataset Statistics
          </Typography>
          <Typography color="text.secondary">
            View statistics about the population of synthetic faces and
            identities.
          </Typography>
          <DatasetStatistics />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <Typography variant="h6" gutterBottom>
            Vote Statistics
          </Typography>
          <Typography color="text.secondary">
            To see voting results and analytics please go to the Voting Variants
            tab and click on Fetch Voting Data button
          </Typography>
          {/* Add vote statistics content here */}
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
          <Typography color="text.secondary">
            Configure voting parameters, comparison algorithms, and display
            options.
          </Typography>
          {/* Add settings content here */}
        </TabPanel>
      </Paper>
    </Box>
  );
}

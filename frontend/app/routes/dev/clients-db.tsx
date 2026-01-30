import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import {
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
} from '@mui/material';
import { useState, useMemo } from 'react';

import { ClientsDataTable } from '~/features/clients-db/components/clients-data-table';
import {
  useClientsDb,
  useDownloadClientsDbCsv,
} from '~/features/clients-db/hooks/use-clients-db';

export function meta() {
  return [
    { title: 'Clients Database - Makeup Match' },
    {
      name: 'description',
      content: 'View and analyze client data from the database',
    },
  ];
}

export default function ClientsDbPage() {
  const { data: clientsData, isLoading, error, refetch } = useClientsDb();
  const downloadCsvMutation = useDownloadClientsDbCsv();
  const [currentTab, setCurrentTab] = useState(0);

  // Calendar pagination state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const handleRefresh = () => {
    refetch();
  };

  const handleDownloadCsv = () => {
    downloadCsvMutation.mutate();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const stats = clientsData
    ? {
        totalClients: clientsData.length,
        withExitTimestamp: clientsData.filter(
          (client) => client['user_flow.exit_timestamp'],
        ).length,
        withRecommendations: clientsData.filter(
          (client) =>
            client['recommendation_focus.final_recommendations']?.length > 0,
        ).length,
        uniqueBrowsers: new Set(
          clientsData
            .map((client) => client['user_flow.browser_name'])
            .filter(Boolean),
        ).size,
        uniqueRetailers: new Set(
          clientsData
            .map((client) => client['user_flow.retailer'])
            .filter(Boolean),
        ).size,
      }
    : null;

  // Process daily statistics for calendar
  const dailyStats = useMemo(() => {
    if (!clientsData) return {};

    const dailyData: Record<
      string,
      {
        date: string;
        users: number;
        startTime: string | null;
        endTime: string | null;
        usersPerHour: number;
      }
    > = {};

    clientsData.forEach((client) => {
      const resultPageTime = client['user_flow.result_page_timestamp'];
      if (!resultPageTime) return;

      // Parse the timestamp and get the date
      const timestamp = new Date(resultPageTime);
      if (isNaN(timestamp.getTime())) return;

      // Use local date to avoid timezone shifts
      const year = timestamp.getFullYear();
      const month = String(timestamp.getMonth() + 1).padStart(2, '0');
      const day = String(timestamp.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`; // YYYY-MM-DD format

      const timeString = timestamp.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          users: 0,
          startTime: timeString,
          endTime: timeString,
          usersPerHour: 0,
        };
      }

      dailyData[dateKey].users += 1;

      // Update start time (earliest)
      if (timeString < dailyData[dateKey].startTime!) {
        dailyData[dateKey].startTime = timeString;
      }

      // Update end time (latest)
      if (timeString > dailyData[dateKey].endTime!) {
        dailyData[dateKey].endTime = timeString;
      }
    });

    // Calculate users per hour for each day
    Object.values(dailyData).forEach((dayData) => {
      if (dayData.startTime && dayData.endTime) {
        const [startHour, startMinute] = dayData.startTime
          .split(':')
          .map(Number);
        const [endHour, endMinute] = dayData.endTime.split(':').map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const durationHours = Math.max(
          0.5,
          (endTotalMinutes - startTotalMinutes) / 60,
        ); // Minimum 30 minutes

        dayData.usersPerHour =
          Math.round((dayData.users / durationHours) * 100) / 100;
      }
    });

    return dailyData;
  }, [clientsData]);

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Clients Database
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View, filter, and analyze client interaction data
        </Typography>
      </Box>

      {/* Action Bar */}
      <Box mb={3}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadCsv}
            disabled={downloadCsvMutation.isPending || isLoading}
          >
            Download CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh Data
          </Button>
          {isLoading && <LinearProgress sx={{ width: 200 }} />}
        </Stack>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box mb={3}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Card variant="outlined" sx={{ minWidth: 200 }}>
              <CardContent sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <StorageIcon color="primary" />
                  <Typography variant="h6" component="div">
                    {stats.totalClients.toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total Clients
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ minWidth: 200 }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="h6" component="div" color="success.main">
                  {stats.withExitTimestamp}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed Sessions
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ minWidth: 200 }}>
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="h6" component="div" color="info.main">
                  {stats.withRecommendations}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  With Recommendations
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ minWidth: 200 }}>
              <CardContent sx={{ pb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" component="div">
                    {stats.uniqueBrowsers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    browsers
                  </Typography>
                  <Typography variant="h6" component="div">
                    {stats.uniqueRetailers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    retailers
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Unique Values
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load clients data: {error.message}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="Database tabs"
        >
          <Tab label="Client Data" />
          <Tab label="Statistics" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        /* Data Table */
        <Paper>
          {clientsData && (
            <ClientsDataTable data={clientsData} loading={isLoading} />
          )}
        </Paper>
      )}

      {currentTab === 1 && (
        /* Statistics Tab */
        <Paper sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box>
              <Typography variant="h6" gutterBottom>
                Daily Activity Calendar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activity based on User Flow Result Page timestamps. Shows
                first/last activity time and user count per day.
              </Typography>
            </Box>

            {/* Calendar Navigation */}
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={handlePreviousMonth} size="small">
                <ChevronLeftIcon />
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                onClick={handleToday}
                startIcon={<TodayIcon />}
              >
                Today
              </Button>
              <Typography
                variant="h6"
                sx={{ minWidth: 180, textAlign: 'center' }}
              >
                {new Date(currentYear, currentMonth).toLocaleDateString(
                  'en-US',
                  {
                    month: 'long',
                    year: 'numeric',
                  },
                )}
              </Typography>
              <IconButton onClick={handleNextMonth} size="small">
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Calendar Layout */}
          <Box sx={{ overflowX: 'auto' }}>
            {(() => {
              // Generate calendar for the current month
              const weeks = [];
              const todayDate = new Date();
              // Use local date for today's key
              const todayYear = todayDate.getFullYear();
              const todayMonth = String(todayDate.getMonth() + 1).padStart(
                2,
                '0',
              );
              const todayDay = String(todayDate.getDate()).padStart(2, '0');
              const todayKey = `${todayYear}-${todayMonth}-${todayDay}`;

              // First day of the month
              const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

              // Last day of the month
              const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

              // Find the Monday of the first week
              const firstDayWeekday = firstDayOfMonth.getDay();
              const daysFromMonday =
                firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

              // Start from Monday before or on the first day of month
              const calendarStart = new Date(firstDayOfMonth);
              calendarStart.setDate(firstDayOfMonth.getDate() - daysFromMonday);

              // Find the Sunday of the last week
              const lastDayWeekday = lastDayOfMonth.getDay();
              const daysToSunday =
                lastDayWeekday === 0 ? 0 : 7 - lastDayWeekday;

              // End on Sunday after or on the last day of month
              const calendarEnd = new Date(lastDayOfMonth);
              calendarEnd.setDate(lastDayOfMonth.getDate() + daysToSunday);

              // Generate weeks
              const currentDate = new Date(calendarStart);

              while (currentDate <= calendarEnd) {
                const weekDays = [];
                for (let day = 0; day < 7; day++) {
                  // Use local date for date key
                  const year = currentDate.getFullYear();
                  const month = String(currentDate.getMonth() + 1).padStart(
                    2,
                    '0',
                  );
                  const dayNum = String(currentDate.getDate()).padStart(2, '0');
                  const dateKey = `${year}-${month}-${dayNum}`;

                  const dayData = dailyStats[dateKey];
                  const isCurrentMonth =
                    currentDate.getMonth() === currentMonth;

                  weekDays.push({
                    date: new Date(currentDate),
                    dateKey,
                    dayData,
                    isToday: dateKey === todayKey,
                    isFuture: currentDate > todayDate,
                    isCurrentMonth,
                  });

                  currentDate.setDate(currentDate.getDate() + 1);
                }
                weeks.push(weekDays);
              }

              return (
                <Box sx={{ minWidth: 800 }}>
                  {/* Calendar Header */}
                  <Box sx={{ display: 'flex', mb: 1 }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                      (dayName) => (
                        <Box
                          key={dayName}
                          sx={{
                            flex: 1,
                            textAlign: 'center',
                            py: 1,
                            bgcolor: 'grey.100',
                            border: '1px solid',
                            borderColor: 'grey.300',
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 'bold',
                              color: 'text.primary',
                            }}
                          >
                            {dayName}
                          </Typography>
                        </Box>
                      ),
                    )}
                  </Box>

                  {/* Calendar Weeks */}
                  {weeks.map((week, weekIndex) => (
                    <Box key={weekIndex} sx={{ display: 'flex', mb: 1 }}>
                      {week.map((day, dayIndex) => (
                        <Box
                          key={dayIndex}
                          sx={{
                            flex: 1,
                            minHeight: 120,
                            border: '1px solid',
                            borderColor: 'grey.300',
                            bgcolor: day.isFuture
                              ? 'grey.50'
                              : !day.isCurrentMonth
                                ? 'grey.100'
                                : 'white',
                            opacity: day.isFuture
                              ? 0.5
                              : !day.isCurrentMonth
                                ? 0.6
                                : 1,
                            position: 'relative',
                            '&:hover': day.dayData
                              ? {
                                  bgcolor: 'action.hover',
                                  cursor: 'pointer',
                                }
                              : {},
                          }}
                        >
                          {/* Date Number */}
                          <Typography
                            variant="body2"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              left: 6,
                              fontWeight: day.isToday ? 'bold' : 'normal',
                              color: day.isToday
                                ? 'primary.main'
                                : day.isFuture
                                  ? 'text.disabled'
                                  : 'text.primary',
                              bgcolor: day.isToday
                                ? 'primary.light'
                                : 'transparent',
                              borderRadius: day.isToday ? '50%' : 0,
                              width: day.isToday ? 20 : 'auto',
                              height: day.isToday ? 20 : 'auto',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                            }}
                          >
                            {day.date.getDate()}
                          </Typography>

                          {/* Activity Data */}
                          {day.dayData && !day.isFuture && (
                            <Box sx={{ p: 1, pt: 3 }}>
                              <Tooltip
                                title={`${day.date.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                })}`}
                              >
                                <Box>
                                  {/* Time Range */}
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: '0.6rem' }}
                                  >
                                    {day.dayData.startTime} -{' '}
                                    {day.dayData.endTime}
                                  </Typography>

                                  {/* Users Count */}
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={0.5}
                                    mt={0.5}
                                  >
                                    <PeopleIcon
                                      sx={{
                                        fontSize: 10,
                                        color: 'success.main',
                                      }}
                                    />
                                    <Typography
                                      variant="caption"
                                      color="success.main"
                                      fontWeight="medium"
                                      sx={{ fontSize: '0.65rem' }}
                                    >
                                      {day.dayData.users}
                                    </Typography>
                                  </Box>

                                  {/* Users per Hour */}
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={0.5}
                                    mt={0.25}
                                  >
                                    <TrendingUpIcon
                                      sx={{ fontSize: 10, color: 'info.main' }}
                                    />
                                    <Typography
                                      variant="caption"
                                      color="info.main"
                                      sx={{ fontSize: '0.65rem' }}
                                    >
                                      {day.dayData.usersPerHour}/hr
                                    </Typography>
                                  </Box>
                                </Box>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              );
            })()}
          </Box>

          {Object.keys(dailyStats).length === 0 && (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              py={6}
            >
              <CalendarIcon
                sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No daily activity data available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activity data will appear here once clients have User Flow
                Result Page timestamps
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Empty State */}
      {!isLoading && !error && clientsData?.length === 0 && (
        <Box display="flex" flexDirection="column" alignItems="center" py={8}>
          <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No client data available
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Client data will appear here once users start interacting with the
            system
          </Typography>
          <Button variant="outlined" onClick={handleRefresh}>
            Check Again
          </Button>
        </Box>
      )}

      {/* Footer Info */}
      <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
        <Typography variant="body2" color="text.secondary">
          <strong>Data Source:</strong> This data is fetched from the{' '}
          <code>/clients_db</code> API endpoint. Data includes client features,
          user flow tracking, and recommendation focus information.
        </Typography>
      </Box>
    </Box>
  );
}

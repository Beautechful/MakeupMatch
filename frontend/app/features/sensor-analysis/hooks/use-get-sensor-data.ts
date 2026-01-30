import { useMutation } from '@tanstack/react-query';

import { fetchSensorData } from '../sensor-analysis-api';

export function useGetSensorData() {
  return useMutation({
    mutationFn: fetchSensorData,
  });
}

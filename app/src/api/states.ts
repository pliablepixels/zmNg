import { getApiClient } from './client';

export interface State {
  Id: string;
  Name: string;
  Definition: string;
  IsActive: string;
}

/**
 * Get all states
 */
export async function getStates(): Promise<State[]> {
  const client = getApiClient();
  const response = await client.get('/states.json');
  return response.data.states || [];
}

/**
 * Change state
 */
export async function changeState(stateName: string): Promise<void> {
  const client = getApiClient();
  await client.post(`/states/change/${stateName}.json`);
}

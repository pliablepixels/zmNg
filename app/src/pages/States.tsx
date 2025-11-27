import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStates, changeState } from '../api/states';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Activity, Check } from 'lucide-react';

export default function States() {
  const queryClient = useQueryClient();

  const { data: states, isLoading, error } = useQuery({
    queryKey: ['states'],
    queryFn: getStates,
  });

  const changeMutation = useMutation({
    mutationFn: changeState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['states'] });
      toast.success('State changed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to change state: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">System States</h1>
        <p>Loading states...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">System States</h1>
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Failed to load states: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="h-8 w-8" />
        <h1 className="text-3xl font-bold">System States</h1>
      </div>

      <p className="text-muted-foreground mb-6">
        Manage ZoneMinder system run states. States control the overall system behavior
        and can enable/disable monitoring across all monitors.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {states?.map((state) => (
          <Card key={state.Id} className={state.IsActive === '1' ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {state.Name}
                    {state.IsActive === '1' && (
                      <Check className="h-5 w-5 text-green-600" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {state.Definition || 'No description available'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => changeMutation.mutate(state.Name)}
                disabled={state.IsActive === '1' || changeMutation.isPending}
                className="w-full"
                variant={state.IsActive === '1' ? 'secondary' : 'default'}
              >
                {state.IsActive === '1' ? 'Active' : 'Activate'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

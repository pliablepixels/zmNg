import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../../../api/events';
import { format, subHours, startOfHour, endOfHour, eachHourOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../theme-provider';

export function TimelineWidget() {
    const { theme } = useTheme();
    const now = new Date();
    const start = subHours(now, 24);

    const { data: events } = useQuery({
        queryKey: ['events', 'timeline-widget'],
        queryFn: () => getEvents({
            startDateTime: format(start, 'yyyy-MM-dd HH:mm:ss'),
            limit: 1000,
        }),
        refetchInterval: 60000,
    });

    // Aggregate events by hour
    const hours = eachHourOfInterval({ start, end: now });
    const data = hours.map(hour => {
        const hourStart = startOfHour(hour);
        const hourEnd = endOfHour(hour);

        const count = events?.events.filter(e => {
            const eventTime = new Date(e.Event.StartDateTime);
            return eventTime >= hourStart && eventTime <= hourEnd;
        }).length || 0;

        return {
            time: format(hour, 'HH:mm'),
            count,
        };
    });

    return (
        <div className="w-full h-full p-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis
                        dataKey="time"
                        stroke="#888888"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={3}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                            borderRadius: '0.5rem',
                            fontSize: '12px'
                        }}
                    />
                    <Bar
                        dataKey="count"
                        fill="currentColor"
                        radius={[4, 4, 0, 0]}
                        className="fill-primary"
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

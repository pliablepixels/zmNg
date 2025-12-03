/**
 * Dashboard Store Tests
 *
 * Tests for the dashboard state management including:
 * - Adding widgets
 * - Removing widgets
 * - Updating widgets
 * - Layout management
 * - Edit mode toggling
 * - Profile-specific widget storage
 * - State persistence and migration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '../dashboard';
import type { DashboardWidget, WidgetType } from '../dashboard';

describe('Dashboard Store', () => {
    beforeEach(() => {
        // Reset store state before each test
        useDashboardStore.setState({
            widgets: {},
            isEditing: false,
        });
    });

    describe('Widget Management', () => {
        it('should add a widget to a profile', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            addWidget(profileId, {
                type: 'monitor',
                title: 'Test Monitor',
                settings: {
                    monitorIds: ['1', '2'],
                },
                layout: {
                    w: 2,
                    h: 1,
                },
            });

            const { widgets } = useDashboardStore.getState();
            const profileWidgets = widgets[profileId];
            expect(profileWidgets).toBeDefined();
            expect(profileWidgets).toHaveLength(1);
            expect(profileWidgets[0].type).toBe('monitor');
            expect(profileWidgets[0].title).toBe('Test Monitor');
            expect(profileWidgets[0].id).toBeDefined();
            expect(profileWidgets[0].layout.i).toBe(profileWidgets[0].id);
        });

        it('should auto-place widgets vertically', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            // Add first widget
            addWidget(profileId, {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 2 },
            });

            // Add second widget
            addWidget(profileId, {
                type: 'events',
                settings: {},
                layout: { w: 1, h: 1 },
            });

            const { widgets } = useDashboardStore.getState();
            const profileWidgets = widgets[profileId];
            expect(profileWidgets[0].layout.y).toBe(0);
            expect(profileWidgets[1].layout.y).toBe(2); // Should be placed after first widget
        });

        it('should remove a widget from a profile', () => {
            const profileId = 'test-profile';
            const { addWidget, removeWidget } = useDashboardStore.getState();

            // Add widget
            addWidget(profileId, {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            let { widgets } = useDashboardStore.getState();
            const widgetId = widgets[profileId][0].id;

            // Remove widget
            removeWidget(profileId, widgetId);

            const state = useDashboardStore.getState();
            expect(state.widgets[profileId]).toHaveLength(0);
        });

        it('should update a widget', () => {
            const profileId = 'test-profile';
            const { addWidget, updateWidget } = useDashboardStore.getState();

            // Add widget
            addWidget(profileId, {
                type: 'monitor',
                title: 'Original Title',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            let { widgets } = useDashboardStore.getState();
            const widgetId = widgets[profileId][0].id;

            // Update widget
            updateWidget(profileId, widgetId, {
                title: 'Updated Title',
                settings: {
                    monitorIds: ['3'],
                },
            });

            const state = useDashboardStore.getState();
            const updatedWidget = state.widgets[profileId][0];
            expect(updatedWidget.title).toBe('Updated Title');
            expect(updatedWidget.settings.monitorIds).toEqual(['3']);
        });

        it('should update layouts', () => {
            const profileId = 'test-profile';
            const { addWidget, updateLayouts } = useDashboardStore.getState();

            // Add widget
            addWidget(profileId, {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            let { widgets } = useDashboardStore.getState();
            const widgetId = widgets[profileId][0].id;

            // Update layout
            updateLayouts(profileId, [
                {
                    i: widgetId,
                    x: 5,
                    y: 3,
                    w: 3,
                    h: 2,
                },
            ]);

            const state = useDashboardStore.getState();
            const updatedWidget = state.widgets[profileId][0];
            expect(updatedWidget.layout.x).toBe(5);
            expect(updatedWidget.layout.y).toBe(3);
            expect(updatedWidget.layout.w).toBe(3);
            expect(updatedWidget.layout.h).toBe(2);
        });
    });

    describe('Profile Isolation', () => {
        it('should store widgets per profile', () => {
            const { addWidget } = useDashboardStore.getState();

            // Add widgets to different profiles
            addWidget('profile-1', {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            addWidget('profile-2', {
                type: 'events',
                settings: {},
                layout: { w: 1, h: 1 },
            });

            addWidget('profile-2', {
                type: 'timeline',
                settings: {},
                layout: { w: 4, h: 2 },
            });

            const { widgets } = useDashboardStore.getState();
            expect(widgets['profile-1']).toHaveLength(1);
            expect(widgets['profile-2']).toHaveLength(2);
            expect(widgets['profile-1'][0].type).toBe('monitor');
            expect(widgets['profile-2'][0].type).toBe('events');
            expect(widgets['profile-2'][1].type).toBe('timeline');
        });

        it('should not affect other profiles when removing widgets', () => {
            const { addWidget, removeWidget } = useDashboardStore.getState();

            // Add widgets to different profiles
            addWidget('profile-1', {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            addWidget('profile-2', {
                type: 'events',
                settings: {},
                layout: { w: 1, h: 1 },
            });

            let { widgets } = useDashboardStore.getState();
            const profile1WidgetId = widgets['profile-1'][0].id;

            // Remove widget from profile-1
            removeWidget('profile-1', profile1WidgetId);

            const state = useDashboardStore.getState();
            expect(state.widgets['profile-1']).toHaveLength(0);
            expect(state.widgets['profile-2']).toHaveLength(1); // Should remain unchanged
        });
    });

    describe('Edit Mode', () => {
        it('should toggle edit mode', () => {
            const { toggleEditMode, isEditing } = useDashboardStore.getState();

            expect(isEditing).toBe(false);

            toggleEditMode();
            expect(useDashboardStore.getState().isEditing).toBe(true);

            toggleEditMode();
            expect(useDashboardStore.getState().isEditing).toBe(false);
        });
    });

    describe('Widget Types', () => {
        it('should support monitor widgets with multiple monitors', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            addWidget(profileId, {
                type: 'monitor',
                settings: {
                    monitorIds: ['1', '2', '3'],
                },
                layout: { w: 2, h: 1 },
            });

            const { widgets } = useDashboardStore.getState();
            const widget = widgets[profileId][0];
            expect(widget.settings.monitorIds).toEqual(['1', '2', '3']);
        });

        it('should support events widgets', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            addWidget(profileId, {
                type: 'events',
                settings: {
                    monitorId: '1',
                    eventCount: 10,
                },
                layout: { w: 1, h: 1 },
            });

            const { widgets } = useDashboardStore.getState();
            const widget = widgets[profileId][0];
            expect(widget.type).toBe('events');
            expect(widget.settings.monitorId).toBe('1');
            expect(widget.settings.eventCount).toBe(10);
        });

        it('should support timeline widgets', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            addWidget(profileId, {
                type: 'timeline',
                settings: {},
                layout: { w: 4, h: 2 },
            });

            const { widgets } = useDashboardStore.getState();
            const widget = widgets[profileId][0];
            expect(widget.type).toBe('timeline');
            expect(widget.layout.w).toBe(4);
            expect(widget.layout.h).toBe(2);
        });
    });

    describe('Layout Constraints', () => {
        it('should set minimum widget dimensions', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            addWidget(profileId, {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            const { widgets } = useDashboardStore.getState();
            const widget = widgets[profileId][0];
            expect(widget.layout.minW).toBe(1);
            expect(widget.layout.minH).toBe(1);
        });

        it('should set initial x position to 0', () => {
            const profileId = 'test-profile';
            const { addWidget } = useDashboardStore.getState();

            addWidget(profileId, {
                type: 'monitor',
                settings: {},
                layout: { w: 2, h: 1 },
            });

            const { widgets } = useDashboardStore.getState();
            const widget = widgets[profileId][0];
            expect(widget.layout.x).toBe(0);
        });
    });
});

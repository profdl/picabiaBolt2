import React from 'react';
import {
    ArrowDown,
    ArrowUp,
    MoveDown,
    MoveUp,
    Copy,
    Trash2,
    Group,
    Ungroup
} from 'lucide-react';
import { Shape, ContextMenuItem } from '../types';

type ContextMenuActions = {
    sendBackward: () => void,
    sendForward: () => void,
    sendToBack: () => void,
    sendToFront: () => void,
    duplicate: () => void,
    deleteShape: (id: string) => void,
    createGroup: (ids: string[]) => void,
    ungroup: (id: string) => void,
};

export const createShapeContextMenu = (
    shape: Shape,
    selectedShapes: string[],
    actions: ContextMenuActions
): ContextMenuItem[] => {
    const menuItems: ContextMenuItem[] = [
        {
            label: 'Send Backward',
            action: actions.sendBackward,
            icon: React.createElement(ArrowDown, { className: "w-4 h-4" })
        },
        {
            label: 'Send Forward',
            action: actions.sendForward,
            icon: React.createElement(ArrowUp, { className: "w-4 h-4" })
        },
        {
            label: 'Send to Back',
            action: actions.sendToBack,
            icon: React.createElement(MoveDown, { className: "w-4 h-4" })
        },
        {
            label: 'Send to Front',
            action: actions.sendToFront,
            icon: React.createElement(MoveUp, { className: "w-4 h-4" })
        },
        {
            label: 'Duplicate',
            action: actions.duplicate,
            icon: React.createElement(Copy, { className: "w-4 h-4" })
        },
        {
            label: 'Delete',
            action: () => actions.deleteShape(shape.id),
            icon: React.createElement(Trash2, { className: "w-4 h-4" })
        }
    ];

    // Add group option if multiple shapes are selected
    if (selectedShapes.length > 1) {
        menuItems.unshift({
            label: 'Group',
            action: () => actions.createGroup(selectedShapes),
            icon: React.createElement(Group, { className: "w-4 h-4" })
        });
    }

    // Add ungroup option if this is a group
    if (shape.type === 'group') {
        menuItems.unshift({
            label: 'Ungroup',
            action: () => actions.ungroup(shape.id),
            icon: React.createElement(Ungroup, { className: "w-4 h-4" })
        });
    }

    return menuItems;
};
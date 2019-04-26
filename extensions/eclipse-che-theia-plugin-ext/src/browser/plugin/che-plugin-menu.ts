/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { injectable, inject } from 'inversify';
import { Menu } from '@phosphor/widgets';
import { CommandRegistry } from '@phosphor/commands';
import { Emitter, Event } from '@theia/core/lib/common';

import { ChePluginManagerCommands, ChePluginCommandContribution } from './che-plugin-command-contribution';

@injectable()
export class ChePluginMenu {

    @inject(ChePluginCommandContribution)
    protected readonly chePluginCommandContribution: ChePluginCommandContribution;

    protected readonly menuClosed = new Emitter<void>();

    get onMenuClosed(): Event<void> {
        return this.menuClosed.event;
    }

    show(x: number, y: number): void {
        const commands = new CommandRegistry();
        const menu = new Menu({
            commands
        });

        this.addCommands(commands, menu);

        menu.aboutToClose.connect(() => {
            this.menuClosed.fire(undefined);
        });

        menu.open(x, y);
    }

    /**
     * Adds commands to the menu for running plugin.
     */
    protected addCommands(commands: CommandRegistry, menu: Menu): void {

        commands.addCommand(ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS.id, {
            label: ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS.label,
            isEnabled: () => false,
            execute: () => setTimeout(() => this.chePluginCommandContribution.showAvailablePlugins(), 100)
        });

        commands.addCommand(ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS.id, {
            label: ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS.label,
            isEnabled: () => false,
            execute: () => setTimeout(() => this.chePluginCommandContribution.showInstalledPlugins(), 100)
        });

        commands.addCommand(ChePluginManagerCommands.SHOW_EDITORS.id, {
            label: ChePluginManagerCommands.SHOW_EDITORS.label,
            isEnabled: () => false,
            execute: () => setTimeout(() => this.chePluginCommandContribution.showEditors(), 100)
        });

        commands.addCommand(ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS.id, {
            label: ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS.label,
            isEnabled: () => false,
            execute: () => setTimeout(() => this.chePluginCommandContribution.showBuiltInPlugins(), 100)
        });

        commands.addCommand(ChePluginManagerCommands.ADD_REGISTRY.id, {
            label: ChePluginManagerCommands.ADD_REGISTRY.label,
            execute: () => setTimeout(() => this.chePluginCommandContribution.addPluginRegistry(), 100)
        });

        commands.addCommand(ChePluginManagerCommands.CHANGE_REGISTRY.id, {
            label: ChePluginManagerCommands.CHANGE_REGISTRY.label,
            execute: () => setTimeout(() => this.chePluginCommandContribution.changePluginRegistry(), 100)
        });

        menu.addItem({
            type: 'command',
            command: ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS.id
        });

        menu.addItem({
            type: 'command',
            command: ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS.id
        });

        menu.addItem({
            type: 'command',
            command: ChePluginManagerCommands.SHOW_EDITORS.id
        });

        menu.addItem({
            type: 'command',
            command: ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS.id
        });

        menu.addItem({
            type: 'separator'
        });

        // menu.addItem({
        //     type: 'command',
        //     command: ChePluginManagerCommands.ADD_REGISTRY.id
        // });

        // menu.addItem({
        //     type: 'command',
        //     command: ChePluginManagerCommands.CHANGE_REGISTRY.id
        // });

        menu.addItem({
            type: 'submenu',
            submenu: this.getSubmenu(commands)
        });

    }

    getSubmenu(commands: CommandRegistry): Menu {
        const menu = new Menu({
            commands
        });
        menu.title.label = 'Other...';

        menu.addItem({
            type: 'command',
            command: ChePluginManagerCommands.ADD_REGISTRY.id
        });

        menu.addItem({
            type: 'command',
            command: ChePluginManagerCommands.CHANGE_REGISTRY.id
        });

        return menu;
    }

}

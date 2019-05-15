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
import { CommandRegistry, CommandContribution } from '@theia/core/lib/common';
import { MessageService, Command } from '@theia/core/lib/common';
import { ChePluginRegistry } from '../../common/che-protocol';
import { ChePluginManager } from './che-plugin-manager';
import { QuickInputService } from '@theia/core/lib/browser';
import { MonacoQuickOpenService } from '@theia/monaco/lib/browser/monaco-quick-open-service';
import { QuickOpenModel, QuickOpenItem, QuickOpenMode } from '@theia/core/lib/browser/quick-open/quick-open-model';

function cmd(id: string, label: string): Command {
    return {
        id: `${ChePluginManagerCommands.PLUGIN_MANAGER_ID}:${id}`,
        category: ChePluginManagerCommands.PLUGIN_MANAGER_CATEGORY,
        label: label
    };
}

export namespace ChePluginManagerCommands {

    export const PLUGIN_MANAGER_ID = 'plugin-manager';
    export const PLUGIN_MANAGER_CATEGORY = 'Plugin Manager';

    export const SHOW_AVAILABLE_PLUGINS = cmd('show-available-plugins', 'Show Available Plugins');
    export const SHOW_INSTALLED_PLUGINS = cmd('show-installed-plugins', 'Show Installed Plugins');
    export const SHOW_EDITORS = cmd('show-editors', 'Show Editors');
    export const SHOW_BUILT_IN_PLUGINS = cmd('show-built-in-plugins', 'Show Built-in Plugins');

    export const CHANGE_REGISTRY = cmd('change-registry', 'Change Registry');
    export const ADD_REGISTRY = cmd('add-registry', 'Add Registry');
}

@injectable()
export class ChePluginCommandContribution implements CommandContribution {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(QuickInputService)
    protected readonly quickInputService: QuickInputService;

    @inject(MonacoQuickOpenService)
    protected readonly monacoQuickOpenService: MonacoQuickOpenService;

    @inject(ChePluginManager)
    protected readonly chePluginManager: ChePluginManager;

    registerCommands(commands: CommandRegistry): void {
        // commands.registerCommand(ChePluginManagerCommands.SHOW_AVAILABLE_PLUGINS, {
        //     // activate: true,
        //     execute: () => this.showAvailablePlugins()
        // });
        // commands.registerCommand(ChePluginManagerCommands.SHOW_INSTALLED_PLUGINS, {
        //     // activate: true,
        //     execute: () => this.showInstalledPlugins()
        // });
        // commands.registerCommand(ChePluginManagerCommands.SHOW_EDITORS, {
        //     // toggle: true,
        //     // isToggle: () => { return true },
        //     // activate: true,
        //     execute: () => this.showEditors()
        // });
        // commands.registerCommand(ChePluginManagerCommands.SHOW_BUILT_IN_PLUGINS, {
        //     // isEnabled: () => false,
        //     // isVisible: () => !!this.cppManager.getActiveConfig(),
        //     execute: () => this.showBuiltInPlugins()
        // });

        commands.registerCommand(ChePluginManagerCommands.CHANGE_REGISTRY, {
            execute: () => this.changePluginRegistry()
        });

        commands.registerCommand(ChePluginManagerCommands.ADD_REGISTRY, {
            execute: () => this.addPluginRegistry()
        });

    }

    // Here are the Extensions view filters:

    // @builtin - Show extensions that come with VS Code. Grouped by type (Programming Languages, Themes, etc.).
    // @disabled - Show disabled installed extensions.
    // @installed - Show installed extensions.
    // @outdated - Show outdated installed extensions. A newer version is available on the Marketplace.
    // @enabled - Show enabled installed extensions. Extensions can be individually enabled/disabled.
    // @recommended - Show recommended extensions. Grouped as Workspace specific or general use.
    // @category - Show extensions belonging to specified category. Below are a few of supported categories.
    // For a complete list, type @category and follow the options in the suggestion list:

    // @category:themes
    // @category:formatters
    // @category:linters
    // @category:snippets

    // @type:che_editor
    // @type:che_plugin
    // @type:theia_plugin
    // @type:vs_code_extension

    //
    async showAvailablePlugins() {
        console.log('>> showAvailablePlugins');

        this.chePluginManager.changeFilter('', true);
    }

    // @installed
    async showInstalledPlugins() {
        console.log('>> showInstalledPlugins');

        this.chePluginManager.changeFilter('@installed', true);
    }

    // @type:che_editor
    async showEditors() {
        console.log('>> showEditors');

        this.chePluginManager.changeFilter('@type:che_editor', true);
    }

    // @builtin
    async showBuiltInPlugins() {
    }

    /**
     * Displays prompt to add new plugin registry
     */
    async addPluginRegistry(): Promise<void> {
        const name = await this.quickInputService.open({
            prompt: 'Name of your registry'
        });

        if (!name) {
            return;
        }

        const uri = await this.quickInputService.open({
            prompt: 'Registry URI'
        });

        if (!uri) {
            return;
        }

        const registry = {
            name,
            uri
        };

        this.chePluginManager.addRegistry(registry);
        this.chePluginManager.changeRegistry(registry);
    }

    private async pickPluginRegistry(): Promise<ChePluginRegistry | undefined> {
        const registryList = this.chePluginManager.getRegistryList();

        return new Promise<ChePluginRegistry | undefined>((resolve, reject) => {
            // Return undefined if registry list is empty
            if (!registryList || registryList.length === 0) {
                resolve(undefined);
                return;
            }

            // Active before appearing the pick menu
            const activeElement: HTMLElement | undefined = window.document.activeElement as HTMLElement;

            // ChePluginRegistry to be returned
            let returnValue: ChePluginRegistry | undefined;

            const items = registryList.map(registry =>
                new QuickOpenItem({
                    label: registry.name,
                    detail: registry.uri,
                    run: mode => {
                        if (mode === QuickOpenMode.OPEN) {
                            returnValue = {
                                name: registry.name,
                                uri: registry.uri
                            } as ChePluginRegistry;
                        }
                        return true;
                    }
                })
            );

            // Create quick open model
            const model = {
                onType(lookFor: string, acceptor: (items: QuickOpenItem[]) => void): void {
                    acceptor(items);
                }
            } as QuickOpenModel;

            // Show pick menu
            this.monacoQuickOpenService.open(model, {
                fuzzyMatchLabel: true,
                fuzzyMatchDetail: true,
                fuzzyMatchDescription: true,
                onClose: () => {
                    if (activeElement) {
                        activeElement.focus();
                    }

                    resolve(returnValue);
                }
            });
        });
    }

    async changePluginRegistry(): Promise<void> {
        const registry = await this.pickPluginRegistry();
        if (registry) {
            this.chePluginManager.changeRegistry(registry);
        }
    }

}

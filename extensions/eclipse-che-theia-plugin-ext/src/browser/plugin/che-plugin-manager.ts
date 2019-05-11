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

import {
    ChePluginRegistry,
    ChePluginMetadata,
    ChePluginService,
    CheApiService
} from '../../common/che-protocol';

import { HostedPluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { MessageService, Emitter, Event } from '@theia/core/lib/common';
import { ConfirmDialog } from '@theia/core/lib/browser';

import { ChePluginPreferences } from './che-plugin-preferences';
import { PreferenceService, PreferenceScope } from '@theia/core/lib/browser/preferences';

@injectable()
export class ChePluginManager {

    /**
     * Default plugin registry
     */
    private defaultRegistry: ChePluginRegistry;

    /**
     * Active plugin registry.
     * Plugin widget should display the list of plugins from this registry.
     */
    private activeRegistry: ChePluginRegistry;

    /**
     * Registry list
     */
    private registryList: ChePluginRegistry[];

    /**
     * List of installed plugins received from workspace config.
     */
    private installedPlugins: string[];

    /**
     * List of plugins, currently available on active plugin registry.
     */
    private availablePlugins: ChePluginMetadata[] = [];

    @inject(ChePluginService)
    protected readonly chePluginService: ChePluginService;

    @inject(HostedPluginServer)
    protected readonly hostedPluginServer: HostedPluginServer;

    @inject(CheApiService)
    protected readonly cheApiService: CheApiService;

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(ChePluginPreferences)
    protected readonly chePluginPreferences: ChePluginPreferences;

    @inject(PreferenceService)
    protected readonly preferenceService: PreferenceService;

    protected readonly pluginRegistryChanged = new Emitter<ChePluginRegistry>();

    protected readonly workspaceConfigurationChanged = new Emitter<boolean>();

    get onPluginRegistryChanged(): Event<ChePluginRegistry> {
        return this.pluginRegistryChanged.event;
    }

    get onWorkspaceConfigurationChanged(): Event<boolean> {
        return this.workspaceConfigurationChanged.event;
    }

    /**
     * Restores list of custom registries
     */
    private async restoreRegistryList(): Promise<void> {
        // wait for preference service
        await this.preferenceService.ready;

        const prefs = this.chePluginPreferences['chePlugins.repositories'];
        if (prefs) {
            const instance = this;
            Object.keys(prefs).forEach(repoName => {
                const uri = prefs[repoName];

                const registry = this.registryList.find(r => r.uri === uri);
                if (registry === undefined) {
                    instance.registryList.push({
                        name: repoName,
                        uri: uri
                    });
                }
            });
        }
    }

    private async initDefaults(): Promise<void> {
        if (!this.defaultRegistry) {
            this.defaultRegistry = await this.chePluginService.getDefaultRegistry();
        }

        if (!this.activeRegistry) {
            this.activeRegistry = this.defaultRegistry;
        }

        if (!this.registryList) {
            this.registryList = [this.defaultRegistry];

            this.registryList.push({
                name: 'Visual Studio Code plugins',
                uri: 'https://marketplace.visualstudio.com/vscode'
            });

            await this.restoreRegistryList();
        }

        if (!this.installedPlugins) {
            // Get list of plugins from workspace config
            this.installedPlugins = await this.chePluginService.getWorkspacePlugins();
        }
    }

    getDefaultRegistry(): ChePluginRegistry {
        return this.defaultRegistry;
    }

    changeRegistry(registry: ChePluginRegistry): void {
        this.activeRegistry = registry;
        this.pluginRegistryChanged.fire(registry);
    }

    addRegistry(registry: ChePluginRegistry): void {
        this.registryList.push(registry);

        // Save list of custom repositories to preferences
        const prefs = {};
        this.registryList.forEach(r => {
            if (r.name !== 'Default') {
                prefs[r.name] = r.uri;
            }
        });

        this.preferenceService.set('chePlugins.repositories', prefs, PreferenceScope.User);
    }

    removeRegistry(registry: ChePluginRegistry): void {
        this.registryList = this.registryList.filter(r => r.uri !== registry.uri);
    }

    getRegistryList(): ChePluginRegistry[] {
        return this.registryList;
    }

    /**
     * Returns plugin list from active registry
     */
    async getPlugins(): Promise<ChePluginMetadata[]> {
        // get list of deployed plugins from runtime
        // will be used in the future
        // const metadata = await this.hostedPluginServer.getDeployedMetadata();

        await this.initDefaults();

        this.availablePlugins = await this.chePluginService.getPlugins(this.activeRegistry);
        return this.availablePlugins;
    }

    isPluginInstalled(plugin: ChePluginMetadata): boolean {
        return this.installedPlugins.indexOf(plugin.key) >= 0;
    }

    async install(plugin: ChePluginMetadata): Promise<boolean> {
        try {
            // add the plugin to workspace configuration
            await this.chePluginService.addPlugin(plugin.key);
            await this.delay(1000);
            this.messageService.info(`Plugin '${plugin.publisher}/${plugin.name}/${plugin.version}' has been successfully installed`);

            // add the plugin to the list of workspace plugins
            this.installedPlugins.push(plugin.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to install plugin '${plugin.publisher}/${plugin.name}/${plugin.version}'. ${error.message}`);
            return false;
        }
    }

    async remove(plugin: ChePluginMetadata): Promise<boolean> {
        try {
            // remove the plugin from workspace configuration
            await this.chePluginService.removePlugin(plugin.key);
            await this.delay(1000);
            this.messageService.info(`Plugin '${plugin.publisher}/${plugin.name}/${plugin.version}' has been successfully removed`);

            // remove the plugin from the list of workspace plugins
            this.installedPlugins = this.installedPlugins.filter(p => p !== plugin.key);

            // notify that workspace configuration has been changed
            this.notifyWorkspaceConfigurationChanged();
            return true;
        } catch (error) {
            this.messageService.error(`Unable to remove plugin '${plugin.publisher}/${plugin.name}/${plugin.version}'. ${error.message}`);
            return false;
        }
    }

    async delay(miliseconds: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => {
                resolve();
            }, miliseconds);
        });
    }

    private notifyWorkspaceConfigurationChanged() {
        setTimeout(() => {
            this.workspaceConfigurationChanged.fire(true);
        }, 500);
    }

    async restartWorkspace(): Promise<void> {
        const confirm = new ConfirmDialog({
            title: 'Restart Workspace',
            msg: 'Are you sure you want to restart your workspace?',
            ok: 'Restart'
        });

        if (await confirm.open()) {
            this.messageService.info('Workspace is restarting...');

            try {
                await this.cheApiService.stop();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (error) {
                this.messageService.error(`Unable to restart your workspace. ${error.message}`);
            }
        }
    }

}
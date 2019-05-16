/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { injectable } from 'inversify';
import * as theia from '@theia/plugin';
import { resolve } from 'path';
import { readFileSync, writeFileSync, format, modify, parse } from '../utils';
import { ConfigurationsExporter } from './export-configs-manager';

const CONFIG_DIR = '.theia';
const TASK_CONFIG_FILE = 'launch.json';
const formattingOptions = { tabSize: 4, insertSpaces: true, eol: '' };

export const VSCODE_TASK_TYPE = 'vscode-task';

/** Exports configurations of tasks in the config file. */
@injectable()
export class TaskConfigurationsExporter implements ConfigurationsExporter {
    readonly type: string = VSCODE_TASK_TYPE;

    export(configsContent: string, workspaceFolder: theia.WorkspaceFolder): void {
        const tasksConfigFileUri = this.getConfigFileUri(workspaceFolder.uri.path);
        const existingContent = readFileSync(tasksConfigFileUri);
        if (configsContent === existingContent) {
            return;
        }

        const configsJson = parse(configsContent);
        if (!configsJson || !configsJson.configurations) {
            return;
        }

        const existingJson = parse(existingContent);
        if (!existingJson || !existingJson.configurations) {
            writeFileSync(tasksConfigFileUri, format(configsContent, formattingOptions));
            return;
        }

        const mergedConfigs = this.merge(existingJson.configurations, configsJson.configurations);
        const result = modify(configsContent, ['tasks'], mergedConfigs, formattingOptions);
        writeFileSync(tasksConfigFileUri, result);
    }

    private merge(existingConfigs: theia.Task[], newConfigs: theia.Task[]): theia.Task[] {
        const result: theia.Task[] = Object.assign([], newConfigs);
        for (const existing of existingConfigs) {
            if (!newConfigs.some(config => config.name === existing.name)) {
                result.push(existing);
            }
        }
        return result;
    }

    private getConfigFileUri(rootDir: string): string {
        return resolve(rootDir.toString(), CONFIG_DIR, TASK_CONFIG_FILE);
    }
}

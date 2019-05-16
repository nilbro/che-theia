/*********************************************************************
 * Copyright (c) 2019 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { URL } from 'url';
import * as path from 'path';
import { resolve } from 'path';
import * as jsoncparser from 'jsonc-parser';
import { FormattingOptions, ParseError, JSONPath } from 'jsonc-parser';

const fs = require('fs');

/**
 * Apply segments to the url endpoint, where are:
 * @param endPointUrl - url endpoint, for example 'http://ws:/some-server/api'
 * @param pathSegements - array path segements, which should be applied one by one to the url.
 * Example:
 * applySegmentsToUri('http://ws:/some-server/api', 'connect', `1`)) => http://ws/some-server/api/connect/1
 * applySegmentsToUri('http://ws:/some-server/api/', 'connect', `1`)) => http://ws/some-server/api/connect/1
 * applySegmentsToUri('http://ws:/some-server/api//', 'connect', `1`)) => http://ws/some-server/api/connect/1
 * applySegmentsToUri('http://ws:/some-server/api', '/connect', `1`)) => error, segment should not contains '/'
 */
export function applySegmentsToUri(endPointUrl: string, ...pathSegements: string[]): string {
    const urlToTransform: URL = new URL(endPointUrl);

    for (const segment of pathSegements) {
        if (segment.indexOf('/') > -1) {
            throw new Error(`path segment ${segment} contains '/'`);
        }
        urlToTransform.pathname = resolve(urlToTransform.pathname, segment);
    }

    return urlToTransform.toString();
}

export function parse(content: string) {
    const strippedContent = jsoncparser.stripComments(content);
    const errors: ParseError[] = [];
    const configurations = jsoncparser.parse(strippedContent, errors);

    if (errors.length) {
        for (const e of errors) {
            console.error(`Error parsing configurations: error: ${e.error}, length:  ${e.length}, offset:  ${e.offset}`);
        }
        return '';
    } else {
        return configurations;
    }
}

export function format(content: string, options: FormattingOptions): string {
    const edits = jsoncparser.format(content, undefined, options);
    return jsoncparser.applyEdits(content, edits);
}

// tslint:disable-next-line:no-any
export function modify(content: string, jsonPath: JSONPath, value: any, options: FormattingOptions): string {
    const edits = jsoncparser.modify(content, jsonPath, value, { formattingOptions: options });
    return jsoncparser.applyEdits(content, edits);
}

export function readFileSync(filePath: string): string {
    try {
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    } catch (e) {
        console.error(e);
        return '';
    }
}

export function writeFileSync(configFilePath: string, content: string): void {
    this.ensureConfigDirExistence(configFilePath);
    fs.writeFileSync(configFilePath, content);
}

export function ensureConfigDirExistence(filePath: string) {
    const dirName = path.dirname(filePath);
    if (fs.existsSync(dirName)) {
        return true;
    }
    fs.mkdirSync(dirName);
}

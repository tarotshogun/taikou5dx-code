/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from "vscode";
import * as completion from "./completion";

const selector: vscode.DocumentSelector = { language: "taikou5dx" };

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      new completion.SnippetFunctionProvider()
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new completion.FirstSnippetProvider()
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new completion.OperatorProvider()
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new completion.AttributeTypeProvider(),
      ":"
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new completion.TriggerTypeProvider(),
      ":"
    ),
    vscode.languages.registerCompletionItemProvider(
      selector,
      new completion.ClassTypeProvider(),
      ":"
    )
  );
}

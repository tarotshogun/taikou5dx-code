/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from "vscode";

abstract class AbstractSuggestionItem {
  abstract label: string;
  abstract kind?: vscode.CompletionItemKind;
  abstract documentation?: string | vscode.MarkdownString;
  abstract sortText?: string;
  abstract insertText?: string | vscode.SnippetString;
  abstract command?: vscode.Command;
}

abstract class AbstractSuggestionItemGroup {
  abstract items: AbstractSuggestionItem[];

  isEmptyFile(document: vscode.TextDocument): boolean {
    return /^\t*?$/g.test(document.getText());
  }

  isHeadOfLine(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    return /^\t*?$/g.test(linePrefix);
  }

  isInConditionScope(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    // TODO(tarot-shogun): 暫定の実装。該当位置よりも上の行に「発生条件:」があり、「スクリプト:」がないことが条件
    const rangeBeforeCursor: vscode.Range = new vscode.Range(
      0,
      0,
      position.line,
      position.character
    );
    const prefix = document.getText(rangeBeforeCursor);
    return (
      prefix.match("発生条件:") != null && prefix.match("スクリプト:") == null
    );
  }

  isInScriptScope(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    // TODO(tarot-shogun): 暫定の実装。該当位置よりも上の行に「発生条件:」と「スクリプト:」があることが条件
    const rangeBeforeCursor: vscode.Range = new vscode.Range(
      0,
      0,
      position.line,
      position.character
    );
    const prefix = document.getText(rangeBeforeCursor);
    return (
      prefix.match("発生条件:") != null && prefix.match("スクリプト:") != null
    );
  }

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    if (this.isEmptyFile(document)) {
      return undefined;
    }

    if (
      this.isHeadOfLine(document, position) &&
      (this.isInConditionScope(document, position) ||
        this.isInScriptScope(document, position))
    ) {
      return this.items;
    }

    return this.provideTypingItems(document, position);
  }

  provideTypingItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    let typingItems: vscode.CompletionItem[] = [];
    for (const item of this.items) {
      if (this.isTyping(item, document, position)) {
        typingItems = typingItems.concat(item);
      }
    }

    if (typingItems.length > 0) {
      return typingItems;
    }

    return undefined;
  }

  // TODO(tarot-shogun): オブジェクト的にitem側のプロパティとしたい
  isTyping(
    item: vscode.CompletionItem,
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    // 「個人戦闘」というアイテムがあった場合は
    // 「個人戦闘」「個人戦」「個人」「個」という比較用のリストを作る
    // TODO(tarot-shogun): Work if label is not string?
    const characters = item.label.toString().split("");
    const regexList: string[] = Array(characters.length);
    for (let i = 0; i < regexList.length; i++) {
      regexList[i] = "";
    }

    for (let i = 0; i < characters.length; i++) {
      for (let j = characters.length; j > i; j--) {
        regexList[j - 1] += characters[i];
      }
    }
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    for (const regex of regexList) {
      if (linePrefix.endsWith(regex)) {
        return true;
      }
    }
    return false;
  }
}

// TODO(tarot-shogun): This is not working. To refactor
abstract class SuggestionItemSnippet extends AbstractSuggestionItem {
  abstract label: string;
  kind?: vscode.CompletionItemKind = vscode.CompletionItemKind.Snippet;
  documentation?: string | vscode.MarkdownString;
  sortText?: string;
  insertText?: string | vscode.SnippetString;
  command?: vscode.Command = {
    command: "editor.action.triggerSuggest",
    title: "Re-trigger completions...",
  };
}

class SuggestionSnippetFunction extends AbstractSuggestionItemGroup {
  items: SuggestionItemSnippet[] = [
    {
      label: "文字列設定",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("文字列設定:($1)[[$2]]"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "所持金変更",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("所持金変更:($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "強制武器交換",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "強制武器交換:(${1|刀剣,槍,苦無,鎖鎌,火縄銃,弓|})"
      ),
    },
    {
      label: "個人戦闘",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "個人戦闘:(${1|逃げられない,逃げられる|},${2|護衛なし,護衛付|}," +
          "$3,$4,$5,$6,$7,$8," +
          "${9|野原,道場,船の甲板,武家宅の庭,城主の間,民家の庭,酒場,忍者宅の庭,砂浜|}," +
          "${10|真,偽|},${11|真,偽|})"
      ),
    },
    {
      label: "改名",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("改名:($1,$2,$3,$4,$5)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "お嫁さん死亡",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("お嫁さん死亡:($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "武将死亡",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("武将死亡:($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "人物登用",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "人物登用:($1,${2|大名,直臣,陪臣,寄騎,その他,無効|},$3)"
      ),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "人物解雇",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "人物解雇:($1,$2,${3|未出現,出現済み|})"
      ),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "国主任命",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("国主任命:($1,$2,$3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "国主解任",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("国主解任:($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "居城変更",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("居城変更:($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "家督を譲る",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("家督を譲る:($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "独立",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "独立:($1,${2:無効},${3|通常,陪臣のみ|})"
      ),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "勢力滅亡",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("勢力滅亡:($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "御用商人になる",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("御用商人になる:($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "会話",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("会話:($1,$2)[[$3]]"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "0",
    },
    {
      label: "会話選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "会話選択:($1,$2)[[$3]]\n選択:([[$4]][[$5]])"
      ),
      sortText: "0",
    },
    {
      label: "会話可否選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "会話可否選択:($1,$2)[[$3]]\n分岐:(可){\n\t$4\n}\n分岐:(否){\n\t$4\n}"
      ),
      sortText: "0",
    },
    {
      label: "変名会話",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "変名会話:($1,$2,[[$3]],[[$4]])[[$5]]"
      ),
    },
    {
      label: "変名会話選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "変名会話選択:($1,$2,[[$3]],[[$4]])[[$5]]\n選択:([[$6]][[$7]])"
      ),
    },
    {
      label: "変名会話可否選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "変名会話可否選択:($1,$2,[[$3]],[[$4]])[[$5]]\n分岐:(可){\n\t$5\n}\n分岐:(否){\n\t$6\n}"
      ),
    },
    {
      label: "ひとりごと",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ひとりごと:[[$1]]"),
      sortText: "0",
    },
    {
      label: "ひとりごと選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "ひとりごと選択:[[$1]]\n選択:([[$2]][[$3]])"
      ),
    },
    {
      label: "ひとりごと可否選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "ひとりごと可否選択:[[$1]]\n分岐:(可){\n\t$2\n}\n分岐:(否){\n\t$3\n}"
      ),
    },
    {
      label: "ナレーション",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ナレーション:[[$1]]"),
      sortText: "0",
    },
    {
      label: "ナレーション選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "ナレーション選択:[[$1]]\n選択:([[$2]][[$3]])"
      ),
    },
    {
      label: "ナレーション可否選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "ナレーション可否選択:[[$1]]\n分岐:(可){\n\t$2\n}\n分岐:(否){\n\t$3\n}"
      ),
    },
    {
      label: "メッセージ閉じる",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("メッセージ閉じる:"),
    },
    {
      label: "選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("選択:[[$1]][[$2]]"),
    },
    {
      label: "コンテナ設定",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("コンテナ設定:($1,$2,$3)"),
    },
    {
      label: "コンテナ絞り込み",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("コンテナ絞り込み:($1,$2,$3)"),
    },
    {
      label: "コンテナ除外",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("コンテナ除外:($1,$2,$3)"),
    },
    {
      label: "コンテナ検索",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("コンテナ検索:($1,$2,$3)"),
    },
    {
      label: "コンテナ選抜",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("コンテナ選抜:($1,$2)"),
    },
    {
      label: "コンテナ複写",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("コンテナ複写:(${1|退避,復帰|})"),
    },
    {
      label: "コンテナソート",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "コンテナソート:($1,$2,${3|昇順,降順|})"
      ),
    },
    {
      label: "コンテナ選択",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        // TODO(tarot-shogun): 人物選択か拠点選択かは第一引数で分かるので改良の余地あり
        "コンテナ選択:($1,${2|先頭,末尾,ポインタ,人物選択,拠点選択,町選択,アイテム選択|})"
      ),
    },
    {
      label: "ゲーム中断",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ゲーム中断:(${1|真,偽|})"),
    },
    {
      label: "ＢＧＭ変更",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ＢＧＭ変更:($1)"),
    },
    {
      label: "ＳＥスタート",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ＳＥスタート:($1)"),
    },
    {
      label: "ＳＥループ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ＳＥループ:($1)"),
    },
    {
      label: "ＳＥストップ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ＳＥストップ:($1)"),
    },
    {
      label: "ウェイト",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ウェイト:($1)"),
    },
    {
      label: "スチル表示",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "スチル表示:(${1|イベントスチル,アイテム,カード,人物,仕官情報|}," +
          "$2,${3:無効},${4:無効},${5|効果なし,フェード,円形ワイプ,回転ワイプ,ラインワイプ|})"
      ),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "スチル消去",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "スチル消去:(${1:無効},${5|効果なし,フェード,円形ワイプ,回転ワイプ,ラインワイプ|})"
      ),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
    {
      label: "背景変更",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "背景変更:($1,$2,${3|効果なし,フェード,円形ワイプ,回転ワイプ,ラインワイプ|})"
      ),
    },
    {
      label: "背景戻す",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "背景変更:(${1|効果なし,フェード,円形ワイプ,回転ワイプ,ラインワイプ|})"
      ),
    },
    {
      label: "施設入る",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("施設入る:($1)"),
    },
    {
      label: "施設出る ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("施設出る:"),
    },
    {
      label: "次の場面",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("次の場面:($1)"),
    },
    {
      label: "外に出す",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("外に出す:"),
    },
    {
      label: "強制移動",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("強制移動:($1)"),
    },
    {
      label: "強制移動ワープ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("強制移動ワープ:($1)"),
    },
    {
      label: "軍団編成",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "軍団編成:($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)"
      ),
    },
    {
      label: "軍団編成最強",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "軍団編成最強:($1,$2,$3,$4,$5,$6,$7,${8:無効},${9:無効},${10:無効},${11:無効}," +
          "$12,$13,$14,$15,$16,$17,$18)"
      ),
    },
    {
      label: "忍者軍団編成",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "忍者軍団編成:($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)"
      ),
    },
    {
      label: "忍者軍団編成最強",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "忍者軍団編成最強:($1,$2,$3,$4,$5,$6,$7,${8:無効},${9:無効},${10:無効},${11:無効}," +
          "$12,$13,$14,$15)"
      ),
    },
    {
      label: "海賊軍団編成",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "海賊軍団編成:($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)"
      ),
    },
    {
      label: "海賊軍団編成最強",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "海賊軍団編成:($1,$2,$3,$4,$5,$6,$7,${8:無効},${9:無効},${10:無効},${11:無効}," +
          "$12,$13,$14,$15,$16,$17,$18)"
      ),
    },
    {
      label: "軍団指令",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("軍団指令:($1,$2,$3,$4,$5)"),
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    if (this.isEmptyFile(document)) {
      return undefined;
    }

    if (
      this.isHeadOfLine(document, position) &&
      this.isInScriptScope(document, position)
    ) {
      return this.items;
    }

    return this.provideTypingItems(document, position);
  }
}

class SuggestionSnippetBlock extends AbstractSuggestionItemGroup {
  items: SuggestionItemSnippet[] = [
    {
      label: "ブロック開始",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ブロック開始:{\n\t$1\n}"),
    },
    {
      label: "ループ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ループ:{\n\t$1\n}"),
    },
    {
      label: "条件ループ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("条件ループ:($1)$2($3){\n\t$4\n}"),
    },
    {
      label: "分岐",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("分岐:($1){\n\t\n}"),
    },
    {
      label: "他岐",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("他岐:($1){\n\t\n}"),
    },
    // TODO(tarot-shogun):場合分岐ブロックについて場合別ブロック内で有効にするように作成する
    {
      label: "場合別",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "場合別:($1){\n\t場合分岐($2){\n\t\t\n\t}\n\t場合分岐($3){\n\t\t\n\t}\n\t場合分岐($4){\n\t\t\n\t}\n}"
      ),
    },
    // TODO(tarot-shogun):主人公分岐ブロックについて主人公別ブロック内で有効にするように作成する
    {
      label: "主人公別",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "主人公別:{\n\t主人公分岐:($1){\n\t\t$2\n\t}\n\t主人公分岐:(その他){\n\t\t\n\t}\n}"
      ),
    },
  ];
}

// class SuggestionSnippetCaseBlock extends AbstractSuggestionItemGroup {
//   items: SuggestionItemSnippet[] = [];

//   isInCaseBlockScope(
//     document: vscode.TextDocument,
//     position: vscode.Position
//   ): boolean {
//     // TODO(tarot-shogun): 暫定の実装
//     const rangeBeforeCursor: vscode.Range = new vscode.Range(
//       0,
//       0,
//       position.line,
//       position.character
//     );
//     const prefix = document.getText(rangeBeforeCursor);
//     return (
//       prefix.match("発生条件:") != null && prefix.match("スクリプト:") == null
//     );
//   }

//   provideItems(
//     document: vscode.TextDocument,
//     position: vscode.Position
//   ): vscode.CompletionItem[] | undefined {
//     if (this.isEmptyFile(document)) {
//       return undefined;
//     }

//     if (
//       this.isHeadOfLine(document, position) &&
//       (this.isInConditionScope(document, position) ||
//         this.isInScriptScope(document, position))
//     ) {
//       return this.items;
//     }

//     return this.provideTypingItems(document, position);
//   }
// }

// class SuggestionSnippetProtagonistBlock extends AbstractSuggestionItemGroup {
//   items: SuggestionItemSnippet[] = [];
// }

class SuggestionSnippetValidateFunction extends AbstractSuggestionItemGroup {
  items: SuggestionItemSnippet[] = [
    {
      label: "調査",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("調査:($1)$2($3)"),
      sortText: "0", //TODO(tarot-shogun): のちのちは単語ごとにenable()かどうか判定させるための一時的な実装。 よく使用するコマンドなので上位に持っていく
    },
    {
      label: "ＡＮＤ調査",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ＡＮＤ調査:{\n\t$1\n}"),
    },
    {
      label: "ＯＲ調査",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("ＯＲ調査:{\n\t$1\n}"),
    },
  ];
}

class SuggestionSnippetSubstitutionFunction extends AbstractSuggestionItemGroup {
  items: SuggestionItemSnippet[] = [
    {
      label: "代入",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳ",
    },
    {
      label: "代入人物",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入人物"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｼﾞﾝﾌﾞﾂ",
    },
    {
      label: "代入勢力",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入勢力"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｾｲﾘｮｸ",
    },
    {
      label: "代入大名家",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入大名家"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳﾀﾞｲﾐｮｳｹ",
    },
    {
      label: "代入商家",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入商家"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｼｮｳｶ",
    },
    {
      label: "代入忍者衆",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入忍者衆"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳﾆﾝｼﾞｬｼｭｳ",
    },
    {
      label: "代入海賊衆",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入海賊衆"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｶｲｿﾞｸｼｭｳ",
    },
    {
      label: "代入拠点",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入拠点"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｷｮﾃﾝ",
    },
    {
      label: "代入城",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入城"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｼﾛ",
    },
    {
      label: "代入町",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入町"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳﾏﾁ",
    },
    {
      label: "代入里",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入里"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｻﾄ",
    },
    {
      label: "代入砦",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入砦"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳﾄﾘﾃﾞ",
    },
    {
      label: "代入軍団",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入軍団"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｸﾞﾝﾀﾞﾝ",
    },
    {
      label: "代入アイテム",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入アイテム"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｱｲﾃﾑ",
    },
    {
      label: "代入地方",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入地方"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳﾁﾎｳ",
    },
    {
      label: "代入国",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入国"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｸﾆ",
    },
    {
      label: "代入流派",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入流派"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳﾘｭｳﾊ",
    },
    {
      label: "代入カード",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入カード"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳ",
    },
    {
      label: "代入交易品",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入交易品"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾆｭｳｺｳｴｷﾋﾝ",
    },
    {
      label: "代入ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｆ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｆ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｇ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｇ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｈ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｈ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｉ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｉ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｊ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｊ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｋ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｋ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｌ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｌ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｍ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｍ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｎ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｎ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｏ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｏ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｐ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｐ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｑ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｑ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｒ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｒ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｓ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｓ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｔ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｔ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｕ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｕ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｖ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｖ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｗ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｗ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｘ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｘ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｙ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｙ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入ｚ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入ｚ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入人物Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入人物Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入人物Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入人物Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入人物Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入人物Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入人物Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入人物Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入人物Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入人物Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入勢力Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入勢力Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入勢力Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入勢力Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入勢力Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入勢力Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入勢力Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入勢力Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入勢力Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入勢力Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入大名家Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入大名家Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入大名家Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入大名家Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入大名家Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入大名家Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入大名家Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入大名家Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入大名家Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入大名家Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入商家Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入商家Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入商家Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入商家Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入商家Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入商家Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入商家Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入商家Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入商家Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入商家Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入忍者衆Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入忍者衆Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入忍者衆Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入忍者衆Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入忍者衆Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入忍者衆Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入忍者衆Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入忍者衆Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入忍者衆Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入忍者衆Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入海賊衆Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入海賊衆Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入海賊衆Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入海賊衆Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入海賊衆Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入海賊衆Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入海賊衆Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入海賊衆Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入海賊衆Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入海賊衆Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入拠点Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入拠点Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入拠点Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入拠点Ｂ:($1)$2($3)"),
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入拠点Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入拠点Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入拠点Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入拠点Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入拠点Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入拠点Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入城Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入城Ａ:($1)$2($3)"),
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入城Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入城Ｂ:($1)$2($3)"),
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入城Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入城Ｃ:($1)$2($3)"),
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入城Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入城Ｄ:($1)$2($3)"),
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入城Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入城Ｅ:($1)$2($3)"),
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入町Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入町Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入町Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入町Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入町Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入町Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入町Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入町Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入町Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入町Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入里Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入里Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入里Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入里Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入里Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入里Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入里Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入里Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入里Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入里Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入砦Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入砦Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入砦Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入砦Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入砦Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入砦Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入砦Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入砦Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入砦Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入砦Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入軍団Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入軍団Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入軍団Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入軍団Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入軍団Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入軍団Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入軍団Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入軍団Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入軍団Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入軍団Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入アイテムＡ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入アイテムＡ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入アイテムＢ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入アイテムＢ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入アイテムＣ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入アイテムＣ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入アイテムＤ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入アイテムＤ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入アイテムＥ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入アイテムＥ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入地方Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入地方Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入地方Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入地方Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入地方Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入地方Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入地方Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入地方Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入地方Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入地方Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入国Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入国Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入国Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入国Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入国Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入国Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入国Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入国Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入国Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入国Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入流派Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入流派Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入流派Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入流派Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入流派Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入流派Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入流派Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入流派Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入流派Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入流派Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入カードＡ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入カードＡ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入カードＢ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入カードＢ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入カードＣ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入カードＣ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入カードＤ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入カードＤ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入カードＥ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入カードＥ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入交易品Ａ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入交易品Ａ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入交易品Ｂ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入交易品Ｂ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入交易品Ｃ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入交易品Ｃ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入交易品Ｄ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入交易品Ｄ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
    {
      label: "代入交易品Ｅ",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("代入交易品Ｅ:($1)$2($3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾝﾀﾞｲﾆｭｳ", // 上に表示されると邪魔なので末尾へ移動する
    },
  ];
}

class SuggestionFirstSnippet extends AbstractSuggestionItemGroup {
  items: AbstractSuggestionItem[] = [
    {
      label: "太閤立志伝５イベントソース",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString(
        "太閤立志伝５イベントソース\n\n" +
          "チャプター:{//チャプターで全てのイベントをくくる太閤立志伝５イベントソース\n" +
          "\tイベント:${1:サンプルイベント}{\n" +
          "\t\t属性:$2\n" +
          "\t\t発生契機:$3\n" +
          "\t\t発生条件:{\n" +
          "\t\t\t$4\n" +
          "\t\t}\n" +
          "\t\tスクリプト:{\n" +
          "\t\t\t$5\n" +
          "\t\t}\n" +
          "\t}\n" +
          "}\n"
      ),
      sortText: "0", // イベントブロック内の記載する順番に合わせる
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    if (this.isEmptyFile(document)) {
      return this.items;
    }
    return undefined;
  }
}

class SuggestionAttributeType extends AbstractSuggestionItemGroup {
  items: AbstractSuggestionItem[] = [
    { label: "一度だけ", kind: vscode.CompletionItemKind.Property },
    { label: "一度だけ｜ひかえめ", kind: vscode.CompletionItemKind.Property },
    { label: "何度でも", kind: vscode.CompletionItemKind.Property },
    { label: "何度でも｜ひかえめ", kind: vscode.CompletionItemKind.Property },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("属性:")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionTriggerType extends AbstractSuggestionItemGroup {
  items: AbstractSuggestionItem[] = [
    {
      label: "ゲームスタート時",
      kind: vscode.CompletionItemKind.Property,
      sortText: "ｹﾞｰﾑｽﾀｰﾄｼﾞ", // 全角カナだと濁音がうまくソートされないため半角を使う
    },
    {
      label: "室内画面表示後",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("室内画面表示後($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｼﾂﾅｲｶﾞﾒﾝﾋｮｳｼﾞｺﾞ",
    },
    {
      label: "人物会話時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("人物会話時($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｼﾞﾝﾌﾞﾂｶｲﾜｼﾞ",
    },
    {
      label: "拠点内画面表示後",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("拠点内画面表示後($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｷｮﾃﾝﾅｲｶﾞﾒﾝﾋｮｳｼﾞｺﾞ",
    },
    {
      label: "施設選択時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("施設選択時($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｼｾﾂｾﾝﾀｸｼﾞ",
    },
    {
      label: "移動画面選択時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("移動画面選択時($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｲﾄﾞｳｶﾞﾒﾝｾﾝﾀｸｼﾞ",
    },
    {
      label: "移動画面表示後",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("移動画面表示後($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｲﾄﾞｳｶﾞﾒﾝﾋｮｳｼﾞｺﾞ",
    },
    {
      label: "軍団移動開始時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("軍団移動開始時($1,$2,$3,$4)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｸﾞﾝﾀﾞﾝｲﾄﾞｳｶｲｼｼﾞ",
    },
    {
      label: "軍団移動終了時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("軍団移動終了時($1,$2,$3,$4)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾌﾝﾀﾞﾝｲﾄﾞｳｼｭｳﾘｮｳｼﾞ",
    },
    {
      label: "野戦画面表示後",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("野戦画面表示後($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾔｾﾝｶﾞﾒﾝﾋｮｳｼﾞｺﾞ",
    },
    {
      label: "野戦開始時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("野戦開始時($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾔｾﾝｶｲｼｼﾞ",
    },
    {
      label: "野戦終了時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("野戦終了時($1,$2,$3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾔｾﾝｼｭｳﾘｮｳｼﾞ",
    },
    {
      label: "攻城戦画面表示後",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("攻城戦画面表示後($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｺｳｼﾞｮｳｾﾝｶﾞﾒﾝﾋｮｳｼﾞｺﾞ",
    },
    {
      label: "攻城戦開始時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("攻城戦開始時($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｺｳｼﾞｮｳｾﾝｶｲｼｼﾞ",
    },
    {
      label: "攻城戦終了時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("攻城戦終了時($1,$2,$3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｺｳｼﾞｮｳｾﾝｼｭｳﾘｮｳｼﾞ",
    },
    {
      label: "一日開始処理の先頭",
      kind: vscode.CompletionItemKind.Property,
      sortText: "ｲﾁﾆﾁｶｲｼｼｮﾘﾉｾﾝﾄｳ",
    },
    {
      label: "毎月処理の最後",
      kind: vscode.CompletionItemKind.Property,
      sortText: "ﾏｲﾂｷｼｮﾘﾉｻｲｺﾞ",
    },
    {
      label: "毎月処理の最後絶対",
      kind: vscode.CompletionItemKind.Property,
      sortText: "ﾏｲﾂｷｼｮﾘﾉｻｲｺﾞｾﾞｯﾀｲ",
    },
    {
      label: "評定開始時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("評定開始時($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾋｮｳﾃｲｶｲｼｼﾞ",
    },
    {
      label: "合戦決定時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("合戦決定時($1,$2,$3)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｶﾞｯｾﾝｹｯﾃｲｼﾞ",
    },
    {
      label: "大名家滅亡時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("大名家滅亡時($1,$2)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ﾀﾞｲﾐｮｳﾒﾂﾎﾞｳｼﾞ",
    },
    {
      label: "ゲームクリア時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("ゲームクリア時($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｹﾞｰﾑｸﾘｱｼﾞ",
    },
    {
      label: "ゲームオーバー時",
      kind: vscode.CompletionItemKind.Property,
      insertText: new vscode.SnippetString("ゲームオーバー時($1)"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
      sortText: "ｹﾞｰﾑｵｰﾊﾞｰｼﾞ",
    },
    {
      label: "チャプター凍結時",
      kind: vscode.CompletionItemKind.Property,
      sortText: "ﾁｬﾌﾟﾀｰﾄｳｹﾂｼﾞ",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("発生契機:")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionClassType extends AbstractSuggestionItemGroup {
  items: AbstractSuggestionItem[] = [
    {
      label: "人物",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "勢力",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "大名家",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "商家",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "忍者衆",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "海賊衆",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "拠点",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "町",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "城",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "里",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "砦",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "国",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "流派",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "特殊な変数",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "状況",
      kind: vscode.CompletionItemKind.Class,
    },
    {
      label: "アイテム",
      kind: vscode.CompletionItemKind.Class,
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (
      /^\t*コンテナ設定:\($/g.test(linePrefix) ||
      /^\t*コンテナ除外:\($/g.test(linePrefix) ||
      /^\t*コンテナ絞り込み:\($/g.test(linePrefix) ||
      /^\t*コンテナソート:\($/g.test(linePrefix)
    ) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionPersonClassSnippet extends AbstractSuggestionItemGroup {
  items: AbstractSuggestionItem[] = [
    {
      label: "人物",
      kind: vscode.CompletionItemKind.Snippet,
      insertText: new vscode.SnippetString("人物::"),
      command: {
        command: "editor.action.triggerSuggest",
        title: "Re-trigger completions...",
      },
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (this.isInPersonalArgument(document, position)) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }

  isInPersonalArgument(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    return (
      /^\t*主人公分岐:\($/g.test(linePrefix) ||
      /^\t*代入[ａ-ｚ]:\([^)]*$/g.test(linePrefix) ||
      /^\t*代入[ａ-ｚ]:\([^)]*\)[^(]*\($/g.test(linePrefix) ||
      /^\t*代入人物[Ａ-Ｚ]:\($/g.test(linePrefix) ||
      /^\t*代入拠点[Ａ-Ｚ]:\($/g.test(linePrefix) ||
      /^\t*会話:\($/g.test(linePrefix) ||
      /^\t*会話:\([^,]+,$/g.test(linePrefix) ||
      /^\t*会話選択:\($/g.test(linePrefix) ||
      /^\t*会話選択:\([^,]+,$/g.test(linePrefix) || // 第一引数を空にすると挙動がおかしくなると思われる
      /^\t*変名会話選択:\($/g.test(linePrefix) ||
      /^\t*変名会話選択:\([^,]+,$/g.test(linePrefix) ||
      /^\t*場合別:\($/g.test(linePrefix) ||
      /^\t*調査:\($/g.test(linePrefix) ||
      /^\t*調査:\(.*\).*\($/g.test(linePrefix) ||
      /^\t*更新:\($/g.test(linePrefix) ||
      /^\t*スチル表示:\([^,]+,$/g.test(linePrefix) ||
      /^\t*個人戦闘:\([^,]+,[^,]+,$/g.test(linePrefix) ||
      /^\t*個人戦闘:\([^,]+,[^,]+,[^,]+,$/g.test(linePrefix) ||
      /^\t*個人戦闘:\([^,]+,[^,]+,[^,]+,[^,]+,$/g.test(linePrefix) ||
      /^\t*個人戦闘:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(linePrefix) ||
      /^\t*個人戦闘:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*個人戦闘:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*改名:\($/g.test(linePrefix) ||
      /^\t*お嫁さん死亡:\($/g.test(linePrefix) ||
      /^\t*武将死亡:\($/g.test(linePrefix) ||
      /^\t*軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*忍者軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*海賊軍団編成最強:\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,$/g.test(
        linePrefix
      ) ||
      /^\t*人物登用:\($/g.test(linePrefix) ||
      /^\t*人物登用:\([^,]+,[^,]+,$/g.test(linePrefix) ||
      /^\t*人物解雇:\($/g.test(linePrefix) ||
      /^\t*城主任命:\($/g.test(linePrefix) ||
      /^\t*国主任命:\($/g.test(linePrefix) ||
      /^\t*国主解任:\($/g.test(linePrefix) ||
      /^\t*家督を譲る:\($/g.test(linePrefix) ||
      /^\t*家督を譲る:\([^,]+,$/g.test(linePrefix) ||
      /^\t*独立:\($/g.test(linePrefix)
    );
  }
}

class SuggestionPersonData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "青山忠成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "赤池長任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "赤井直正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "安西又助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "赤尾清綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "明石全登",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "赤穴盛清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "赤松政秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "赤松義祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "秋上久家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "安芸国虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "秋田実季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "秋山虎繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "明智秀満",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "明智光秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "浅井井頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "浅井長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "浅井久政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "朝倉景鏡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "朝倉景健",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "朝倉景恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "朝倉景連",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "朝倉宗滴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "朝倉義景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "浅野長晟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "浅野長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "浅野幸長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "朝比奈泰朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "浅利勝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "足利義昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "足利義氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "足利義輝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "蘆名盛氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "蘆名盛興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "蘆名盛重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "蘆名盛隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "阿蘇惟将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "安宅信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "安宅冬康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "跡部勝資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "穴山小助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "穴山梅雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "姉小路頼綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "阿部正次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "尼子勝久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "尼子晴久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "尼子義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "天野隆重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "天野康景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "雨森弥兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "鮎貝宗重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "荒木氏綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "荒木村重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "有馬晴信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "安国寺恵瓊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "安東高季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "安東愛季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "安藤直次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "安藤守就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "安藤良整",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "飯尾連龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "飯田覚兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "井伊直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "伊賀崎道順",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "伊木忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "池田惣左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "池田恒興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "池田輝政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "池田元助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "池頼和",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "生駒親正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "石川昭光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "石川数正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "石川五右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "石川高信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "石田三成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "石母田景頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "伊集院忠倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "伊集院忠棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "以心崇伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "磯野員昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "板倉勝重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "板部岡江雪斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "伊丹康直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "市川経好",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "一栗放牛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "一条兼定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "一条信龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "伊地知重興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "伊地知重秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "一万田鑑実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "一色義清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "一色義定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "一色義道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "出浦盛清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "伊藤一刀斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "伊東祐兵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "伊藤惣十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "伊東義祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "伊奈忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "稲富一夢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "稲葉一鉄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "稲葉貞通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "稲葉正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "猪苗代盛国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "猪子兵介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "猪俣邦憲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "今井宗久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "今井宗薫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "今川氏真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "今川義元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "宇野藤右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "色部勝長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "色部長実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "岩成友通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "犬童頼安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "上杉景勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "上杉景虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "上杉景信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "上杉謙信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "神屋宗湛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "坂田源右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "鵜飼孫六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "宇喜多忠家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "宇喜多直家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "宇喜多秀家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "宇久純定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "宇久純玄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "宇佐美定満",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "氏家卜全",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "氏家光氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "氏家守棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "氏家行広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "牛尾幸清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "臼杵鑑速",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "宇都宮国綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "宇都宮広綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "鵜殿氏長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "鵜殿長照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "宇山久兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "浦上宗景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "上井覚兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "海野六郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "頴娃久虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "江村親家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "江里口信常",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "円城寺信胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "遠藤直経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "遠藤基信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "大石智久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "大内定綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "大内輝弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "大内義長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "大久保忠佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "大久保忠教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "大久保忠隣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "大久保忠世",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "大久保長安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "大熊朝秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "大崎義隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "大崎義直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "大須賀康高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "太田氏資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "太田牛一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "太田三楽斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "大谷吉継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "大月景秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "大友宗麟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "大友親家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "大友親盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "大友義統",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "大野治長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "大村純忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "小笠原長時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "小笠原少斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "岡家利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "岡部貞綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "岡部正綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "岡部元信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "岡本随縁斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "岡本禅哲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "岡本頼氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "岡吉正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "奥平信昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "奥村永福",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "長船貞親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "長船綱直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "小瀬甫庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
    {
      label: "小田氏治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0188",
    },
    {
      label: "織田有楽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0189",
    },
    {
      label: "織田信勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0190",
    },
    {
      label: "織田信雄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0191",
    },
    {
      label: "織田信包",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0192",
    },
    {
      label: "織田信孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0193",
    },
    {
      label: "織田信忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0194",
    },
    {
      label: "織田信長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0195",
    },
    {
      label: "織田秀信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0196",
    },
    {
      label: "小寺政職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0197",
    },
    {
      label: "小島弥太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0198",
    },
    {
      label: "鬼庭左月",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0199",
    },
    {
      label: "鬼庭綱元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0200",
    },
    {
      label: "小野鎮幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0201",
    },
    {
      label: "小野善鬼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0202",
    },
    {
      label: "小野忠明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0203",
    },
    {
      label: "小野寺輝道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0204",
    },
    {
      label: "小野寺義道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0205",
    },
    {
      label: "小幡勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0206",
    },
    {
      label: "小浜景隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0207",
    },
    {
      label: "飯富虎昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0208",
    },
    {
      label: "小山田信茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0209",
    },
    {
      label: "甲斐宗運",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0210",
    },
    {
      label: "海北綱親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0211",
    },
    {
      label: "香川親和",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0212",
    },
    {
      label: "香川元景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0213",
    },
    {
      label: "柿崎景家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0214",
    },
    {
      label: "蠣崎季広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0215",
    },
    {
      label: "蠣崎慶広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0216",
    },
    {
      label: "垣屋光成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0217",
    },
    {
      label: "筧十蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0218",
    },
    {
      label: "葛西晴信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0219",
    },
    {
      label: "笠原政堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0220",
    },
    {
      label: "梶原景宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0221",
    },
    {
      label: "果心居士",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0222",
    },
    {
      label: "糟谷武則",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0223",
    },
    {
      label: "片桐且元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0224",
    },
    {
      label: "片倉景綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0225",
    },
    {
      label: "佐甲藤太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0226",
    },
    {
      label: "堅田元慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0227",
    },
    {
      label: "桂元澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0228",
    },
    {
      label: "葛山氏元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0229",
    },
    {
      label: "加藤清正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0230",
    },
    {
      label: "加藤段蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0231",
    },
    {
      label: "加藤光泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0232",
    },
    {
      label: "加藤嘉明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0233",
    },
    {
      label: "金上盛備",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0234",
    },
    {
      label: "金森長近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0235",
    },
    {
      label: "可児才蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0236",
    },
    {
      label: "鐘捲自斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0237",
    },
    {
      label: "蒲池鑑盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0238",
    },
    {
      label: "亀井茲矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0239",
    },
    {
      label: "蒲生氏郷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0240",
    },
    {
      label: "蒲生賢秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0241",
    },
    {
      label: "蒲生定秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0242",
    },
    {
      label: "蒲生頼郷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0243",
    },
    {
      label: "蒲生秀行",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0244",
    },
    {
      label: "川上忠智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0245",
    },
    {
      label: "川上久朗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0246",
    },
    {
      label: "河尻秀隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0247",
    },
    {
      label: "河田長親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0248",
    },
    {
      label: "願証寺証恵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0249",
    },
    {
      label: "神戸具盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0250",
    },
    {
      label: "菅達長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0251",
    },
    {
      label: "城井鎮房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0252",
    },
    {
      label: "喜入季久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0253",
    },
    {
      label: "木曽義昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0254",
    },
    {
      label: "木曽義康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0255",
    },
    {
      label: "北条景広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0256",
    },
    {
      label: "北条高広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0257",
    },
    {
      label: "北信愛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0258",
    },
    {
      label: "北畠具教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0259",
    },
    {
      label: "北畠具房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0260",
    },
    {
      label: "北畠晴具",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0261",
    },
    {
      label: "吉川経家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0262",
    },
    {
      label: "吉川広家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0263",
    },
    {
      label: "吉川元長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0264",
    },
    {
      label: "吉川元春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0265",
    },
    {
      label: "木下昌直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0266",
    },
    {
      label: "木村重成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0267",
    },
    {
      label: "肝付兼続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0268",
    },
    {
      label: "肝付兼護",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0269",
    },
    {
      label: "肝付良兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0270",
    },
    {
      label: "京極高次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0271",
    },
    {
      label: "京極高知",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0272",
    },
    {
      label: "京極高吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0273",
    },
    {
      label: "吉良親貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0274",
    },
    {
      label: "吉良親実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0275",
    },
    {
      label: "霧隠才蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0276",
    },
    {
      label: "九鬼広隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0277",
    },
    {
      label: "九鬼守隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0278",
    },
    {
      label: "九鬼嘉隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0279",
    },
    {
      label: "楠長諳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0280",
    },
    {
      label: "口羽通良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0281",
    },
    {
      label: "朽木元綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0282",
    },
    {
      label: "国司元相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0283",
    },
    {
      label: "国友善兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0284",
    },
    {
      label: "九戸政実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0285",
    },
    {
      label: "熊谷信直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0286",
    },
    {
      label: "組屋源四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0287",
    },
    {
      label: "末吉孫左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0288",
    },
    {
      label: "蔵田五郎左",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0289",
    },
    {
      label: "来島通総",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0290",
    },
    {
      label: "村上通康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0291",
    },
    {
      label: "黒田如水",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0292",
    },
    {
      label: "黒田長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0293",
    },
    {
      label: "黒田職隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0294",
    },
    {
      label: "桑名吉成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0295",
    },
    {
      label: "上泉信綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0296",
    },
    {
      label: "高坂甚内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0297",
    },
    {
      label: "高坂昌信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0298",
    },
    {
      label: "香宗我部親泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0299",
    },
    {
      label: "河野牛福丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0300",
    },
    {
      label: "河野通宣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0301",
    },
    {
      label: "高力清長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0302",
    },
    {
      label: "小島職鎮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0303",
    },
    {
      label: "五代友喜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0304",
    },
    {
      label: "児玉就英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0305",
    },
    {
      label: "木造具政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0306",
    },
    {
      label: "籠手田安一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0307",
    },
    {
      label: "籠手田安経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0308",
    },
    {
      label: "後藤賢豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0309",
    },
    {
      label: "後藤信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0310",
    },
    {
      label: "後藤又兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0311",
    },
    {
      label: "小西行長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0312",
    },
    {
      label: "小西隆佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0313",
    },
    {
      label: "小早川隆景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0314",
    },
    {
      label: "小早川秀秋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0315",
    },
    {
      label: "小早川秀包",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0316",
    },
    {
      label: "小堀遠州",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0317",
    },
    {
      label: "小梁川盛宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0318",
    },
    {
      label: "近藤義武",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0319",
    },
    {
      label: "西園寺公広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0320",
    },
    {
      label: "雑賀孫一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0321",
    },
    {
      label: "斎藤龍興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0322",
    },
    {
      label: "斎藤伝鬼坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0323",
    },
    {
      label: "斎藤道三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0324",
    },
    {
      label: "斎藤利三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0325",
    },
    {
      label: "斎藤朝信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0326",
    },
    {
      label: "斎藤義龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0327",
    },
    {
      label: "斎村政広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0328",
    },
    {
      label: "佐伯惟定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0329",
    },
    {
      label: "吉田印西",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0330",
    },
    {
      label: "酒井家次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0331",
    },
    {
      label: "酒井忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0332",
    },
    {
      label: "酒井忠世",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0333",
    },
    {
      label: "坂井政尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0334",
    },
    {
      label: "榊原康政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0335",
    },
    {
      label: "坂崎直盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0336",
    },
    {
      label: "相良義陽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0337",
    },
    {
      label: "相良頼房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0338",
    },
    {
      label: "佐久間信盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0339",
    },
    {
      label: "佐久間盛重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0340",
    },
    {
      label: "佐久間盛政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0341",
    },
    {
      label: "鮭延秀綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0342",
    },
    {
      label: "佐々木小次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0343",
    },
    {
      label: "笹部勘二郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0344",
    },
    {
      label: "佐世元嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0345",
    },
    {
      label: "佐竹義昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0346",
    },
    {
      label: "佐竹義重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0347",
    },
    {
      label: "佐竹義宣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0348",
    },
    {
      label: "佐竹義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0349",
    },
    {
      label: "佐田彦四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0350",
    },
    {
      label: "佐々成政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0351",
    },
    {
      label: "里見義堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0352",
    },
    {
      label: "里見義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0353",
    },
    {
      label: "里見義康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0354",
    },
    {
      label: "里見義頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0355",
    },
    {
      label: "真田信綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0356",
    },
    {
      label: "真田信幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0357",
    },
    {
      label: "真田昌輝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0358",
    },
    {
      label: "真田昌幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0359",
    },
    {
      label: "真田幸隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0360",
    },
    {
      label: "真田幸村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0361",
    },
    {
      label: "佐野房綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0362",
    },
    {
      label: "佐分利猪之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0363",
    },
    {
      label: "猿飛佐助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0364",
    },
    {
      label: "猿渡信光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0365",
    },
    {
      label: "山本寺定長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0366",
    },
    {
      label: "椎名康胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0367",
    },
    {
      label: "志賀親次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0368",
    },
    {
      label: "志賀親守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0369",
    },
    {
      label: "繁沢元氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0370",
    },
    {
      label: "宍戸隆家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0371",
    },
    {
      label: "宍戸梅軒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0372",
    },
    {
      label: "宍戸元続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0373",
    },
    {
      label: "七条兼仲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0374",
    },
    {
      label: "七里頼周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0375",
    },
    {
      label: "篠原長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0376",
    },
    {
      label: "斯波詮直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0377",
    },
    {
      label: "斯波詮真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0378",
    },
    {
      label: "柴田勝家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0379",
    },
    {
      label: "柴田勝豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0380",
    },
    {
      label: "新発田重家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0381",
    },
    {
      label: "新発田長敦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0382",
    },
    {
      label: "芝辻清右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0383",
    },
    {
      label: "渋谷与右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0384",
    },
    {
      label: "島井宗室",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0385",
    },
    {
      label: "島左近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0386",
    },
    {
      label: "島津家久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0387",
    },
    {
      label: "島津日新斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0388",
    },
    {
      label: "島津貴久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0389",
    },
    {
      label: "島津忠恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0390",
    },
    {
      label: "島津歳久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0391",
    },
    {
      label: "島津豊久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0392",
    },
    {
      label: "島津義虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0393",
    },
    {
      label: "島津義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0394",
    },
    {
      label: "島津義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0395",
    },
    {
      label: "清水宗治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0396",
    },
    {
      label: "清水康英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0397",
    },
    {
      label: "志村光安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0398",
    },
    {
      label: "下間仲孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0399",
    },
    {
      label: "下間頼照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0400",
    },
    {
      label: "下間頼廉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0401",
    },
    {
      label: "上条政繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0402",
    },
    {
      label: "白石宗実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0403",
    },
    {
      label: "神西元通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0404",
    },
    {
      label: "神保氏張",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0405",
    },
    {
      label: "神保長住",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0406",
    },
    {
      label: "神保長城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0407",
    },
    {
      label: "神保長職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0408",
    },
    {
      label: "陶晴賢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0409",
    },
    {
      label: "菅沼定盈",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0410",
    },
    {
      label: "杉谷善住坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0411",
    },
    {
      label: "杉之坊照算",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0412",
    },
    {
      label: "鈴木佐太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0413",
    },
    {
      label: "鈴木重朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0414",
    },
    {
      label: "薄田兼相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0415",
    },
    {
      label: "鈴木元信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0416",
    },
    {
      label: "須田満親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0417",
    },
    {
      label: "津田宗及",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0418",
    },
    {
      label: "角倉素庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0419",
    },
    {
      label: "角倉了以",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0420",
    },
    {
      label: "関一政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0421",
    },
    {
      label: "関口氏広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0422",
    },
    {
      label: "世鬼政時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0423",
    },
    {
      label: "関盛信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0424",
    },
    {
      label: "仙石秀久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0425",
    },
    {
      label: "千利休",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0426",
    },
    {
      label: "相馬盛胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0427",
    },
    {
      label: "相馬義胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0428",
    },
    {
      label: "宗義調",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0429",
    },
    {
      label: "宗義智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0430",
    },
    {
      label: "十河一存",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0431",
    },
    {
      label: "十河存保",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0432",
    },
    {
      label: "太原雪斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0433",
    },
    {
      label: "大道寺政繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0434",
    },
    {
      label: "大宝寺義氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0435",
    },
    {
      label: "高島正重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0436",
    },
    {
      label: "高梨政頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0437",
    },
    {
      label: "高橋鑑種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0438",
    },
    {
      label: "高橋紹運",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0439",
    },
    {
      label: "高山重友",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0440",
    },
    {
      label: "高山友照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0441",
    },
    {
      label: "滝川一益",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0442",
    },
    {
      label: "滝川雄利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0443",
    },
    {
      label: "田北鎮周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0444",
    },
    {
      label: "滝本寺非有",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0445",
    },
    {
      label: "武井夕庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0446",
    },
    {
      label: "武田勝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0447",
    },
    {
      label: "武田逍遙軒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0448",
    },
    {
      label: "武田信玄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0449",
    },
    {
      label: "武田信繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0450",
    },
    {
      label: "武田信豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0451",
    },
    {
      label: "武田元明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0452",
    },
    {
      label: "武田義信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0453",
    },
    {
      label: "竹中重門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0454",
    },
    {
      label: "竹中半兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0455",
    },
    {
      label: "立花道雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0456",
    },
    {
      label: "立花直次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0457",
    },
    {
      label: "立花宗茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0458",
    },
    {
      label: "立原久綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0459",
    },
    {
      label: "楯岡満茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0460",
    },
    {
      label: "伊達実元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0461",
    },
    {
      label: "伊達成実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0462",
    },
    {
      label: "伊達稙宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0463",
    },
    {
      label: "伊達輝宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0464",
    },
    {
      label: "伊達晴宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0465",
    },
    {
      label: "伊達政宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0466",
    },
    {
      label: "田中勝助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0467",
    },
    {
      label: "田中吉政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0468",
    },
    {
      label: "谷忠澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0469",
    },
    {
      label: "種子島時堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0470",
    },
    {
      label: "種子島久時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0471",
    },
    {
      label: "田村清顕",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0472",
    },
    {
      label: "多羅尾光俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0473",
    },
    {
      label: "田原親賢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0474",
    },
    {
      label: "千賀孫兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0475",
    },
    {
      label: "千坂景親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0476",
    },
    {
      label: "千葉邦胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0477",
    },
    {
      label: "千葉胤富",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0478",
    },
    {
      label: "茶屋又四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0479",
    },
    {
      label: "茶屋四郎次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0480",
    },
    {
      label: "長宗我部国親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0481",
    },
    {
      label: "長宗我部信親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0482",
    },
    {
      label: "長宗我部元親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0483",
    },
    {
      label: "長宗我部盛親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0484",
    },
    {
      label: "長続連",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0485",
    },
    {
      label: "長連龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0486",
    },
    {
      label: "塚原卜伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0487",
    },
    {
      label: "津軽為信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0488",
    },
    {
      label: "柘植三之丞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0489",
    },
    {
      label: "津田信澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0490",
    },
    {
      label: "土屋昌恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0491",
    },
    {
      label: "筒井定次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0492",
    },
    {
      label: "筒井順慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0493",
    },
    {
      label: "角隈石宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0494",
    },
    {
      label: "津野親忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0495",
    },
    {
      label: "土居宗珊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0496",
    },
    {
      label: "土井利勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0497",
    },
    {
      label: "東郷重位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0498",
    },
    {
      label: "藤堂高虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0499",
    },
    {
      label: "遠山景任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0500",
    },
    {
      label: "遠山綱景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0501",
    },
    {
      label: "戸川秀安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0502",
    },
    {
      label: "戸川逵安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0503",
    },
    {
      label: "土岐頼次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0504",
    },
    {
      label: "得居通之",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0505",
    },
    {
      label: "徳川家康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0506",
    },
    {
      label: "徳川信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0507",
    },
    {
      label: "徳川秀忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0508",
    },
    {
      label: "戸沢盛安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0509",
    },
    {
      label: "富田景政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0510",
    },
    {
      label: "富田重政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0511",
    },
    {
      label: "富田勢源",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0512",
    },
    {
      label: "富田隆実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0513",
    },
    {
      label: "富永山随",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0514",
    },
    {
      label: "豊臣秀次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0515",
    },
    {
      label: "豊臣秀長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0516",
    },
    {
      label: "豊臣秀吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0517",
    },
    {
      label: "豊臣秀頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0518",
    },
    {
      label: "鳥居強右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0519",
    },
    {
      label: "鳥居忠吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0520",
    },
    {
      label: "鳥居元忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0521",
    },
    {
      label: "内藤如安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0522",
    },
    {
      label: "内藤昌豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0523",
    },
    {
      label: "内藤正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0524",
    },
    {
      label: "直江景綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0525",
    },
    {
      label: "直江兼続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0526",
    },
    {
      label: "長井道利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0527",
    },
    {
      label: "長尾政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0528",
    },
    {
      label: "中川清秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0529",
    },
    {
      label: "長坂釣閑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0530",
    },
    {
      label: "中島重房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0531",
    },
    {
      label: "中島可之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0532",
    },
    {
      label: "中条景泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0533",
    },
    {
      label: "永田徳本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0534",
    },
    {
      label: "長野具藤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0535",
    },
    {
      label: "長野業正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0536",
    },
    {
      label: "長野業盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0537",
    },
    {
      label: "中野宗時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0538",
    },
    {
      label: "中村一氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0539",
    },
    {
      label: "道川兵衛三郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0540",
    },
    {
      label: "中山朝正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0541",
    },
    {
      label: "名古屋山三郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0542",
    },
    {
      label: "奈佐日本助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0543",
    },
    {
      label: "那須資晴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0544",
    },
    {
      label: "長束正家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0545",
    },
    {
      label: "夏目吉信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0546",
    },
    {
      label: "鍋島勝茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0547",
    },
    {
      label: "鍋島直茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0548",
    },
    {
      label: "呂宋助左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0549",
    },
    {
      label: "成田氏長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0550",
    },
    {
      label: "成田長忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0551",
    },
    {
      label: "成田長泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0552",
    },
    {
      label: "成松信勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0553",
    },
    {
      label: "成富茂安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0554",
    },
    {
      label: "南部利直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0555",
    },
    {
      label: "南部信直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0556",
    },
    {
      label: "南部晴政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0557",
    },
    {
      label: "新納忠元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0558",
    },
    {
      label: "西川仁右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0559",
    },
    {
      label: "仁科盛信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0560",
    },
    {
      label: "二曲輪猪助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0561",
    },
    {
      label: "二宮就辰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0562",
    },
    {
      label: "二本松義継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0563",
    },
    {
      label: "丹羽長重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0564",
    },
    {
      label: "丹羽長秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0565",
    },
    {
      label: "温井景隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0566",
    },
    {
      label: "沼田祐光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0567",
    },
    {
      label: "根岸兎角",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0568",
    },
    {
      label: "禰寝重長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0569",
    },
    {
      label: "根津甚八",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0570",
    },
    {
      label: "乃美宗勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0571",
    },
    {
      label: "拝郷家嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0572",
    },
    {
      label: "垪和氏続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0573",
    },
    {
      label: "芳賀高定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0574",
    },
    {
      label: "芳賀高継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0575",
    },
    {
      label: "友野二郎兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0576",
    },
    {
      label: "支倉常長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0577",
    },
    {
      label: "畠山高政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0578",
    },
    {
      label: "畠山義続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0579",
    },
    {
      label: "畠山義綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0580",
    },
    {
      label: "波多野晴通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0581",
    },
    {
      label: "波多野秀尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0582",
    },
    {
      label: "波多野秀治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0583",
    },
    {
      label: "蜂須賀家政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0584",
    },
    {
      label: "蜂須賀小六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0585",
    },
    {
      label: "蜂屋頼隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0586",
    },
    {
      label: "服部半蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0587",
    },
    {
      label: "堀立直正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0588",
    },
    {
      label: "花房正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0589",
    },
    {
      label: "花房正幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0590",
    },
    {
      label: "花房職秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0591",
    },
    {
      label: "馬場信春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0592",
    },
    {
      label: "林崎甚助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0593",
    },
    {
      label: "林秀貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0594",
    },
    {
      label: "原田宗時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0595",
    },
    {
      label: "原虎胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0596",
    },
    {
      label: "原昌胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0597",
    },
    {
      label: "播磨屋宗徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0598",
    },
    {
      label: "塙直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0599",
    },
    {
      label: "塙団右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0600",
    },
    {
      label: "疋田豊五郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0601",
    },
    {
      label: "久武親直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0602",
    },
    {
      label: "久武親信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0603",
    },
    {
      label: "鴻池新六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0604",
    },
    {
      label: "日根野弘就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0605",
    },
    {
      label: "百武賢兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0606",
    },
    {
      label: "平井経治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0607",
    },
    {
      label: "平岩親吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0608",
    },
    {
      label: "平岡房実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0609",
    },
    {
      label: "平賀元相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0610",
    },
    {
      label: "平手汎秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0611",
    },
    {
      label: "平野長泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0612",
    },
    {
      label: "風魔小太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0613",
    },
    {
      label: "深水長智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0614",
    },
    {
      label: "福島正則",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0615",
    },
    {
      label: "福留親政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0616",
    },
    {
      label: "福留儀重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0617",
    },
    {
      label: "福原貞俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0618",
    },
    {
      label: "古田織部",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0619",
    },
    {
      label: "不破光治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0620",
    },
    {
      label: "別所長治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0621",
    },
    {
      label: "穂井田元清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0622",
    },
    {
      label: "北条氏勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0623",
    },
    {
      label: "北条氏邦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0624",
    },
    {
      label: "北条氏繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0625",
    },
    {
      label: "北条氏照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0626",
    },
    {
      label: "北条氏直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0627",
    },
    {
      label: "北条氏規",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0628",
    },
    {
      label: "北条氏政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0629",
    },
    {
      label: "北条氏康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0630",
    },
    {
      label: "北条幻庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0631",
    },
    {
      label: "北条綱成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0632",
    },
    {
      label: "宝蔵院胤栄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0633",
    },
    {
      label: "保科正俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0634",
    },
    {
      label: "安井道頓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0635",
    },
    {
      label: "細川忠興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0636",
    },
    {
      label: "細川晴元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0637",
    },
    {
      label: "細川幽斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0638",
    },
    {
      label: "堀尾忠氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0639",
    },
    {
      label: "堀尾吉晴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0640",
    },
    {
      label: "堀直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0641",
    },
    {
      label: "堀内氏善",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0642",
    },
    {
      label: "堀秀治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0643",
    },
    {
      label: "堀秀政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0644",
    },
    {
      label: "本因坊算砂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0645",
    },
    {
      label: "本願寺教如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0646",
    },
    {
      label: "本願寺顕如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0647",
    },
    {
      label: "本願寺准如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0648",
    },
    {
      label: "北郷時久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0649",
    },
    {
      label: "本庄繁長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0650",
    },
    {
      label: "本多重次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0651",
    },
    {
      label: "本多忠勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0652",
    },
    {
      label: "本多忠朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0653",
    },
    {
      label: "本多忠政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0654",
    },
    {
      label: "本多正純",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0655",
    },
    {
      label: "本多正信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0656",
    },
    {
      label: "前田慶次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0657",
    },
    {
      label: "前田玄以",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0658",
    },
    {
      label: "前田利家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0659",
    },
    {
      label: "前田利長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0660",
    },
    {
      label: "前田利政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0661",
    },
    {
      label: "前野長康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0662",
    },
    {
      label: "前波吉継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0663",
    },
    {
      label: "真壁氏幹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0664",
    },
    {
      label: "真柄直澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0665",
    },
    {
      label: "真柄直隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0666",
    },
    {
      label: "正木時茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0667",
    },
    {
      label: "正木時忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0668",
    },
    {
      label: "正木頼忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0669",
    },
    {
      label: "増田長盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0670",
    },
    {
      label: "益田元祥",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0671",
    },
    {
      label: "松井康之",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0672",
    },
    {
      label: "松井友閑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0673",
    },
    {
      label: "松倉重信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0674",
    },
    {
      label: "松倉重政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0675",
    },
    {
      label: "松下加兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0676",
    },
    {
      label: "松平忠吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0677",
    },
    {
      label: "松田憲秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0678",
    },
    {
      label: "松永久秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0679",
    },
    {
      label: "松永久通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0680",
    },
    {
      label: "松波義親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0681",
    },
    {
      label: "角屋七郎次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0682",
    },
    {
      label: "松浦鎮信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0683",
    },
    {
      label: "松浦隆信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0684",
    },
    {
      label: "曲直瀬道三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0685",
    },
    {
      label: "丸目長恵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0686",
    },
    {
      label: "三雲成持",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0687",
    },
    {
      label: "御宿勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0688",
    },
    {
      label: "水谷胤重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0689",
    },
    {
      label: "水野勝成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0690",
    },
    {
      label: "水野忠重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0691",
    },
    {
      label: "水野信元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0692",
    },
    {
      label: "溝尾庄兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0693",
    },
    {
      label: "溝口秀勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0694",
    },
    {
      label: "三刀屋久祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0695",
    },
    {
      label: "三村家親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0696",
    },
    {
      label: "三村元親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0697",
    },
    {
      label: "宮部継潤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0698",
    },
    {
      label: "宮本伝太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0699",
    },
    {
      label: "宮本武蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0700",
    },
    {
      label: "三好笑巌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0701",
    },
    {
      label: "三好長治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0702",
    },
    {
      label: "三好長逸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0703",
    },
    {
      label: "三好長慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0704",
    },
    {
      label: "三好為三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0705",
    },
    {
      label: "三好宗渭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0706",
    },
    {
      label: "三好義興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0707",
    },
    {
      label: "三好実休",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0708",
    },
    {
      label: "三好義継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0709",
    },
    {
      label: "向井正綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0710",
    },
    {
      label: "村井貞勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0711",
    },
    {
      label: "村井長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0712",
    },
    {
      label: "村上国清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0713",
    },
    {
      label: "村上武吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0714",
    },
    {
      label: "村上元吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0715",
    },
    {
      label: "村上義清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0716",
    },
    {
      label: "毛受勝照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0717",
    },
    {
      label: "毛利勝永",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0718",
    },
    {
      label: "毛利重能",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0719",
    },
    {
      label: "毛利隆元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0720",
    },
    {
      label: "毛利輝元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0721",
    },
    {
      label: "毛利元就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0722",
    },
    {
      label: "最上義光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0723",
    },
    {
      label: "最上義時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0724",
    },
    {
      label: "最上義守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0725",
    },
    {
      label: "望月六郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0726",
    },
    {
      label: "本山茂宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0727",
    },
    {
      label: "籾井教業",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0728",
    },
    {
      label: "百地三太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0729",
    },
    {
      label: "森下道誉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0730",
    },
    {
      label: "森忠政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0731",
    },
    {
      label: "母里太兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0732",
    },
    {
      label: "森長可",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0733",
    },
    {
      label: "森村春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0734",
    },
    {
      label: "森可成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0735",
    },
    {
      label: "森蘭丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0736",
    },
    {
      label: "師岡一羽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0737",
    },
    {
      label: "問註所統景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0738",
    },
    {
      label: "八板金兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0739",
    },
    {
      label: "柳生石舟斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0740",
    },
    {
      label: "柳生兵庫助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0741",
    },
    {
      label: "柳生宗矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0742",
    },
    {
      label: "施薬院全宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0743",
    },
    {
      label: "矢沢頼綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0744",
    },
    {
      label: "矢沢頼康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0745",
    },
    {
      label: "屋代景頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0746",
    },
    {
      label: "安田顕元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0747",
    },
    {
      label: "安田長秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0748",
    },
    {
      label: "柳原戸兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0749",
    },
    {
      label: "山県昌景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0750",
    },
    {
      label: "山崎片家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0751",
    },
    {
      label: "山崎長徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0752",
    },
    {
      label: "山田有信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0753",
    },
    {
      label: "山田長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0754",
    },
    {
      label: "山田宗昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0755",
    },
    {
      label: "山中鹿介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0756",
    },
    {
      label: "山中俊好",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0757",
    },
    {
      label: "山名祐豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0758",
    },
    {
      label: "山名禅高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0759",
    },
    {
      label: "山内一豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0760",
    },
    {
      label: "山本勘助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0761",
    },
    {
      label: "湯浅五助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0762",
    },
    {
      label: "結城晴朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0763",
    },
    {
      label: "結城秀康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0764",
    },
    {
      label: "結城政勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0765",
    },
    {
      label: "遊佐続光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0766",
    },
    {
      label: "由利鎌之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0767",
    },
    {
      label: "横谷左近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0768",
    },
    {
      label: "吉江景資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0769",
    },
    {
      label: "吉岡憲法",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0770",
    },
    {
      label: "吉岡清十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0771",
    },
    {
      label: "吉岡伝七郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0772",
    },
    {
      label: "吉岡長増",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0773",
    },
    {
      label: "吉田重俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0774",
    },
    {
      label: "吉田孝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0775",
    },
    {
      label: "吉田政重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0776",
    },
    {
      label: "吉田康俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0777",
    },
    {
      label: "吉弘鑑理",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0778",
    },
    {
      label: "吉見正頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0779",
    },
    {
      label: "世瀬蔵人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0780",
    },
    {
      label: "淀屋常安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0781",
    },
    {
      label: "簗田藤左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0782",
    },
    {
      label: "依岡左京",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0783",
    },
    {
      label: "龍造寺家就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0784",
    },
    {
      label: "龍造寺隆信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0785",
    },
    {
      label: "龍造寺長信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0786",
    },
    {
      label: "龍造寺信周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0787",
    },
    {
      label: "龍造寺政家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0788",
    },
    {
      label: "留守政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0789",
    },
    {
      label: "六角承禎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0790",
    },
    {
      label: "六角義治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0791",
    },
    {
      label: "若林鎮興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0792",
    },
    {
      label: "脇坂安治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0793",
    },
    {
      label: "分部光嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0794",
    },
    {
      label: "和田昭為",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0795",
    },
    {
      label: "和田惟政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0796",
    },
    {
      label: "渡辺勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0797",
    },
    {
      label: "渡辺守綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0798",
    },
    {
      label: "亘理元宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0799",
    },
    {
      label: "上杉憲政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0800",
    },
    {
      label: "武田信虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0801",
    },
    {
      label: "大内義隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0802",
    },
    {
      label: "織田信秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0803",
    },
    {
      label: "松平広忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0804",
    },
    {
      label: "平手政秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0805",
    },
    {
      label: "九鬼浄隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0806",
    },
    {
      label: "畠山秋高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0807",
    },
    {
      label: "赤松晴政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0808",
    },
    {
      label: "少弐冬尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0809",
    },
    {
      label: "有馬義貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0810",
    },
    {
      label: "大友義鑑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0811",
    },
    {
      label: "本願寺証如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0812",
    },
    {
      label: "大宝寺義増",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0813",
    },
    {
      label: "斯波義統",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0814",
    },
    {
      label: "織田信友",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0815",
    },
    {
      label: "細川氏綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0816",
    },
    {
      label: "六角定頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0817",
    },
    {
      label: "島津勝久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0818",
    },
    {
      label: "筒井順昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0819",
    },
    {
      label: "二階堂盛義",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0820",
    },
    {
      label: "一宮随波斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0821",
    },
    {
      label: "有馬晴純",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0822",
    },
    {
      label: "相良晴広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0823",
    },
    {
      label: "村上吉充",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0824",
    },
    {
      label: "岩間小熊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0825",
    },
    {
      label: "梶原政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0826",
    },
    {
      label: "松永長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0827",
    },
    {
      label: "毛利秀元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0828",
    },
    {
      label: "大谷休泊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0829",
    },
    {
      label: "遊佐信教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0830",
    },
    {
      label: "田北紹鉄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0831",
    },
    {
      label: "冷泉隆豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0832",
    },
    {
      label: "相良武任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0833",
    },
    {
      label: "飯田興秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0834",
    },
    {
      label: "児玉就方",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0835",
    },
    {
      label: "白井賢胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0836",
    },
    {
      label: "織田信光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0837",
    },
    {
      label: "小山田信有",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0838",
    },
    {
      label: "尼子国久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0839",
    },
    {
      label: "尼子誠久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0840",
    },
    {
      label: "坂井大膳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0841",
    },
    {
      label: "別所就治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0842",
    },
    {
      label: "志道広良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0843",
    },
    {
      label: "鍋島清房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0844",
    },
    {
      label: "神屋紹策",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0845",
    },
    {
      label: "内藤興盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0846",
    },
    {
      label: "島津実久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0847",
    },
    {
      label: "井上元兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0848",
    },
    {
      label: "津田宗達",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0849",
    },
    {
      label: "阿蘇惟豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0850",
    },
    {
      label: "津田算長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0851",
    },
    {
      label: "杉重矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0852",
    },
    {
      label: "城井長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0853",
    },
    {
      label: "葛西晴胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0854",
    },
    {
      label: "江上武種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0855",
    },
    {
      label: "佐伯惟教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0856",
    },
    {
      label: "宇久玄雅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0857",
    },
    {
      label: "二木重高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0858",
    },
    {
      label: "高田又兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0859",
    },
    {
      label: "大宝寺義興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0860",
    },
    {
      label: "大野治房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0861",
    },
    {
      label: "水原親憲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0862",
    },
    {
      label: "津軽信枚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0863",
    },
    {
      label: "小山田茂誠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0864",
    },
    {
      label: "十時連貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0865",
    },
    {
      label: "井伊直孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0866",
    },
    {
      label: "片倉重長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0867",
    },
    {
      label: "成田長親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0868",
    },
    {
      label: "最上家親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0869",
    },
    {
      label: "上田重安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0870",
    },
    {
      label: "小梁川宗朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0871",
    },
    {
      label: "大国実頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0872",
    },
    {
      label: "梅津政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0873",
    },
    {
      label: "三淵藤英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0874",
    },
    {
      label: "本多政重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0875",
    },
    {
      label: "栗山善助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0876",
    },
    {
      label: "多賀谷政広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0877",
    },
    {
      label: "土岐為頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0878",
    },
    {
      label: "舞兵庫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0879",
    },
    {
      label: "山上道及",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0880",
    },
    {
      label: "蜂須賀至鎮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0881",
    },
    {
      label: "真田信尹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0882",
    },
    {
      label: "伊東マンショ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0883",
    },
    {
      label: "宮部長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0884",
    },
    {
      label: "朝比奈信置",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0885",
    },
    {
      label: "金森可重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0886",
    },
    {
      label: "斯波義銀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0887",
    },
    {
      label: "毛利秀頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0888",
    },
    {
      label: "津川義冬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0889",
    },
    {
      label: "留守顕宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0890",
    },
    {
      label: "原長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0891",
    },
    {
      label: "平塚為広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0892",
    },
    {
      label: "妻木広忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0893",
    },
    {
      label: "鳥屋尾満栄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0894",
    },
    {
      label: "野村直隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0895",
    },
    {
      label: "土居清良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0896",
    },
    {
      label: "島津忠直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0897",
    },
    {
      label: "一柳直末",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0898",
    },
    {
      label: "三木直頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0899",
    },
    {
      label: "杉浦玄任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0900",
    },
    {
      label: "色部顕長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0901",
    },
    {
      label: "中条藤資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0902",
    },
    {
      label: "江上家種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0903",
    },
    {
      label: "甘粕景継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0904",
    },
    {
      label: "安田作兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0905",
    },
    {
      label: "河野通直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0906",
    },
    {
      label: "姉小路良頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0907",
    },
    {
      label: "竹中久作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0908",
    },
    {
      label: "阿閉貞征",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0909",
    },
    {
      label: "森田浄雲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0910",
    },
    {
      label: "熊谷元直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0911",
    },
    {
      label: "明智光安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0912",
    },
    {
      label: "別所重棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0913",
    },
    {
      label: "小川祐忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0914",
    },
    {
      label: "吉弘鎮信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0915",
    },
    {
      label: "佃十成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0916",
    },
    {
      label: "大谷吉治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0917",
    },
    {
      label: "有馬豊氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0918",
    },
    {
      label: "神代勝利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0919",
    },
    {
      label: "赤星統家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0920",
    },
    {
      label: "伊集院忠朗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0921",
    },
    {
      label: "樺山久高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0922",
    },
    {
      label: "藤田信吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0923",
    },
    {
      label: "間宮康俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0924",
    },
    {
      label: "由布惟信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0925",
    },
    {
      label: "小浜光隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0926",
    },
    {
      label: "天草四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0927",
    },
    {
      label: "船越景直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0928",
    },
    {
      label: "伊達小次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0929",
    },
    {
      label: "金光文右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0930",
    },
    {
      label: "友野宗善",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0931",
    },
    {
      label: "多米元忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0932",
    },
    {
      label: "宇野源十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0933",
    },
    {
      label: "津田宗凡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0934",
    },
    {
      label: "末次平蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0935",
    },
    {
      label: "甘粕景持",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0936",
    },
    {
      label: "山崎吉家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0937",
    },
    {
      label: "唐沢玄蕃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0938",
    },
    {
      label: "植田光次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0939",
    },
    {
      label: "大林坊俊海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0940",
    },
    {
      label: "内田トメ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0941",
    },
    {
      label: "奥弥兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0942",
    },
    {
      label: "秦泉寺豊後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0943",
    },
    {
      label: "後藤宗印",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0944",
    },
    {
      label: "愛洲元香斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0945",
    },
    {
      label: "上泉泰綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0946",
    },
    {
      label: "瀬戸方久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0947",
    },
    {
      label: "蘇我理右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0948",
    },
    {
      label: "松下常慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0949",
    },
    {
      label: "曲直瀬玄朔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0950",
    },
    {
      label: "三枝昌貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0951",
    },
    {
      label: "石田正澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0952",
    },
    {
      label: "一柳直盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0953",
    },
    {
      label: "駒井高白斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0954",
    },
    {
      label: "鎌田政年",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0955",
    },
    {
      label: "清水景治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0956",
    },
    {
      label: "千々石ミゲル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0957",
    },
    {
      label: "弥助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0958",
    },
    {
      label: "三浦按針",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0959",
    },
    {
      label: "ハイレディン",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0960",
    },
    {
      label: "佐伯杏太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0961",
    },
    {
      label: "長谷川宗仁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0962",
    },
    {
      label: "長谷川等伯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0963",
    },
    {
      label: "狩野永徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0964",
    },
    {
      label: "本阿弥光悦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0965",
    },
    {
      label: "朝山日乗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0966",
    },
    {
      label: "快川紹喜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0967",
    },
    {
      label: "多聞院英俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0968",
    },
    {
      label: "沢庵宗彭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0969",
    },
    {
      label: "フロイス",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0970",
    },
    {
      label: "アルメイダ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0971",
    },
    {
      label: "リル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0972",
    },
    {
      label: "ラファエル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0973",
    },
    {
      label: "菊亭晴季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0974",
    },
    {
      label: "天皇",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0975",
    },
    {
      label: "三法師",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0976",
    },
    {
      label: "淀殿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0977",
    },
    {
      label: "ねね",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0978",
    },
    {
      label: "なか",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0979",
    },
    {
      label: "お市",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0980",
    },
    {
      label: "まつ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0981",
    },
    {
      label: "菊姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0982",
    },
    {
      label: "早川殿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0983",
    },
    {
      label: "相模",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0984",
    },
    {
      label: "福",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0985",
    },
    {
      label: "冬姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0986",
    },
    {
      label: "梅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0987",
    },
    {
      label: "誾千代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0988",
    },
    {
      label: "愛姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0989",
    },
    {
      label: "義姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0990",
    },
    {
      label: "豪姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0991",
    },
    {
      label: "玉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0992",
    },
    {
      label: "帰蝶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0993",
    },
    {
      label: "瀬名",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0994",
    },
    {
      label: "徳姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0995",
    },
    {
      label: "千代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0996",
    },
    {
      label: "小松",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0997",
    },
    {
      label: "安岐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0998",
    },
    {
      label: "三条",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0999",
    },
    {
      label: "初姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1000",
    },
    {
      label: "小督",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1001",
    },
    {
      label: "彦鶴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1002",
    },
    {
      label: "永姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1003",
    },
    {
      label: "煕子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1004",
    },
    {
      label: "幸円",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1005",
    },
    {
      label: "春桃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1006",
    },
    {
      label: "出雲の阿国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1007",
    },
    {
      label: "しづ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1008",
    },
    {
      label: "たえ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1009",
    },
    {
      label: "すず",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1010",
    },
    {
      label: "つう",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1011",
    },
    {
      label: "はる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1012",
    },
    {
      label: "さよ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1013",
    },
    {
      label: "あや",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1014",
    },
    {
      label: "なつ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1015",
    },
    {
      label: "ふみ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1016",
    },
    {
      label: "ゆき",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1017",
    },
    {
      label: "こと",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1018",
    },
    {
      label: "みよ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1019",
    },
    {
      label: "しの",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1020",
    },
    {
      label: "うんちく爺さん",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1021",
    },
    {
      label: "くノ一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1022",
    },
    {
      label: "行商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1023",
    },
    {
      label: "南光坊天海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1024",
    },
    {
      label: "天室光育",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1025",
    },
    {
      label: "虎哉宗乙",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1026",
    },
    {
      label: "海北友松",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1027",
    },
    {
      label: "嶺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1028",
    },
    {
      label: "千歳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1029",
    },
    {
      label: "胡蝶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1030",
    },
    {
      label: "白樫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1031",
    },
    {
      label: "新庄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1032",
    },
    {
      label: "山手",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1033",
    },
    {
      label: "照姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1034",
    },
    {
      label: "南姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1035",
    },
    {
      label: "九郎判官義経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1036",
    },
    {
      label: "相馬小次郎将門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1037",
    },
    {
      label: "汎用姫様",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1038",
    },
    {
      label: "吾作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1039",
    },
    {
      label: "汎用町人男",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1040",
    },
    {
      label: "マリア",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1041",
    },
    {
      label: "ティアル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1042",
    },
    {
      label: "門番",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1043",
    },
    {
      label: "米屋の主人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1044",
    },
    {
      label: "馬屋の主人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1045",
    },
    {
      label: "酒場の女将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1046",
    },
    {
      label: "宿屋の女将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1047",
    },
    {
      label: "農民男",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1048",
    },
    {
      label: "農民女",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1049",
    },
    {
      label: "町民男",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1050",
    },
    {
      label: "町民女",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1051",
    },
    {
      label: "商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1052",
    },
    {
      label: "僧侶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1053",
    },
    {
      label: "剣術の師範",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1054",
    },
    {
      label: "公家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1055",
    },
    {
      label: "忍者",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1056",
    },
    {
      label: "足軽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1057",
    },
    {
      label: "旅人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1058",
    },
    {
      label: "酔った男",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1059",
    },
    {
      label: "酔った女",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1060",
    },
    {
      label: "あやしい娘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1061",
    },
    {
      label: "汎用くノ一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1062",
    },
    {
      label: "子供",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1063",
    },
    {
      label: "小姓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1064",
    },
    {
      label: "用心棒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1065",
    },
    {
      label: "賊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1066",
    },
    {
      label: "備大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1067",
    },
    {
      label: "座の親父",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1068",
    },
    {
      label: "朝鮮商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1069",
    },
    {
      label: "明国商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1070",
    },
    {
      label: "琉球商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1071",
    },
    {
      label: "南蛮商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1072",
    },
    {
      label: "剣術の師範代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1073",
    },
    {
      label: "倭寇",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1074",
    },
    {
      label: "上忍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1075",
    },
    {
      label: "親分",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1076",
    },
    {
      label: "番頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1077",
    },
    {
      label: "鍛冶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1078",
    },
    {
      label: "医者",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1079",
    },
    {
      label: "槍術の師範代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1080",
    },
    {
      label: "海賊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1081",
    },
    {
      label: "槍術の師範",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1082",
    },
    {
      label: "下男",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1083",
    },
    {
      label: "山賊の親分",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1084",
    },
    {
      label: "海賊の親分",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1085",
    },
    {
      label: "中忍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1086",
    },
    {
      label: "女の子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1087",
    },
    {
      label: "婆さん",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1088",
    },
    {
      label: "敵備大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1089",
    },
    {
      label: "敵忍者備大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1090",
    },
    {
      label: "敵海賊備大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1091",
    },
    {
      label: "熟練用心棒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1092",
    },
    {
      label: "凄腕用心棒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1093",
    },
    {
      label: "主人公奥さん",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1094",
    },
    {
      label: "ＭＰ主人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1095",
    },
    {
      label: "人物Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1096",
    },
    {
      label: "人物Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1097",
    },
    {
      label: "人物Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1098",
    },
    {
      label: "人物Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1099",
    },
    {
      label: "人物Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1100",
    },
    {
      label: "発生人物",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1101",
    },
    {
      label: "目標人物",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1102",
    },
    {
      label: "勲功陪臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1103",
    },
    {
      label: "外交陪臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1104",
    },
    {
      label: "武力陪臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1105",
    },
    {
      label: "勲功家臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1106",
    },
    {
      label: "外交家臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1107",
    },
    {
      label: "武力家臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1108",
    },
    {
      label: "主人公当主",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1109",
    },
    {
      label: "主人公",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1110",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1111",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("人物::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionHubData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "勝山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "大浦城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "八戸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "三戸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "九戸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "不来方城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "高水寺城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "岩出山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "寺池城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "名生城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "仙台城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "白石城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "湊城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "檜山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "角館城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "横手城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "山形城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "鮭延城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "尾浦城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "米沢城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "黒川城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "二本松城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "須賀川城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "小高城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "太田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "水戸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "土浦城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "小田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "宇都宮城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "唐沢山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "小山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "烏山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "厩橋城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "沼田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "館林城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "箕輪城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "勝浦城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "久留里城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "稲村城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "佐倉城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "結城城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "江戸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "岩槻城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "河越城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "忍城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "八王子城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "小田原城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "玉縄城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "韮山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "春日山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "新発田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "本庄城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "栃尾城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "富山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "魚津城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "七尾城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "尾山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "小松城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "大聖寺城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "一乗谷城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "北ノ庄城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "金ヶ崎城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "戸石城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "海津城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "飯山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "小諸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "高遠城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "木曽福島城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "飯田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "躑躅ヶ崎城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "岩殿城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "下山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "駿府城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "興国寺城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "曳馬城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "二俣城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "高天神城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "岡崎城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "長篠城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "吉田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "清洲城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "鳴海城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "小牧山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "那古野城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "稲葉山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "墨俣城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "大垣城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "岩村城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "曽根城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "松倉城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "安濃津城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "大河内城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "長島城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "鳥羽城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "小谷城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "佐和山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "今浜城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "観音寺城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "坂本城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "日野城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "多聞山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "信貴山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "大和郡山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "伊賀上野城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "勝龍寺城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "二条城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "丹波亀山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "八上城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "福知山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "宮津城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "岸和田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "飯盛城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "高屋城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "石山本願城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "芥川城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "有岡城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "雑賀城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "新宮城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "鳥取城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "出石城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "羽衣石城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "月山富田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "三刀屋城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "白鹿城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "益田城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "山吹城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "置塩城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "御着城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "三木城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "上月城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "三星城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "岡山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "砥石山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "天神山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "備中松山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "備中高松城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "三原城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "甲山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "吉田郡山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "佐東銀山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "桜尾城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "山口城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "且山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "十河城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "天霧城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "湯築城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "川之江城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "宇和島城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "撫養城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "勝瑞城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "洲本城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "白地城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "岡豊城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "安芸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "中村城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "金石城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "立花山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "岩屋城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "柳川城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "久留米城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "佐嘉城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "大村城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "平戸城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "日野江城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "岩尾城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "隈本城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "人吉城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "八代城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "城井谷城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "小倉城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "府内城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "岡城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "佐伯城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "都於郡城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "飫肥城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "県城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "大隅高山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "加治木城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "内城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "出水城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "宇須岸の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "弘前の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "花巻の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "仙台の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "土崎湊の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "酒田の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "会津の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "鹿島の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
    {
      label: "足利の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0188",
    },
    {
      label: "厩橋の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0189",
    },
    {
      label: "木更津の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0190",
    },
    {
      label: "佐倉の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0191",
    },
    {
      label: "江戸の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0192",
    },
    {
      label: "小田原の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0193",
    },
    {
      label: "直江津の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0194",
    },
    {
      label: "富山の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0195",
    },
    {
      label: "輪島の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0196",
    },
    {
      label: "金沢の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0197",
    },
    {
      label: "敦賀の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0198",
    },
    {
      label: "小諸の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0199",
    },
    {
      label: "諏訪の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0200",
    },
    {
      label: "甲府の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0201",
    },
    {
      label: "駿府の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0202",
    },
    {
      label: "浜松の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0203",
    },
    {
      label: "岡崎の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0204",
    },
    {
      label: "清洲の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0205",
    },
    {
      label: "井ノ口の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0206",
    },
    {
      label: "松倉の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0207",
    },
    {
      label: "大湊の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0208",
    },
    {
      label: "今浜の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0209",
    },
    {
      label: "目加田の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0210",
    },
    {
      label: "奈良の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0211",
    },
    {
      label: "京の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0212",
    },
    {
      label: "亀山の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0213",
    },
    {
      label: "小浜の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0214",
    },
    {
      label: "堺の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0215",
    },
    {
      label: "石山の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0216",
    },
    {
      label: "雑賀の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0217",
    },
    {
      label: "出石の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0218",
    },
    {
      label: "鳥取の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0219",
    },
    {
      label: "松江の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0220",
    },
    {
      label: "温泉津の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0221",
    },
    {
      label: "姫路の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0222",
    },
    {
      label: "津山の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0223",
    },
    {
      label: "長船の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0224",
    },
    {
      label: "倉敷の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0225",
    },
    {
      label: "尾道の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0226",
    },
    {
      label: "厳島の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0227",
    },
    {
      label: "赤間関の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0228",
    },
    {
      label: "丸亀の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0229",
    },
    {
      label: "今治の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0230",
    },
    {
      label: "鳴門の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0231",
    },
    {
      label: "浦戸の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0232",
    },
    {
      label: "博多の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0233",
    },
    {
      label: "柳川の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0234",
    },
    {
      label: "平戸の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0235",
    },
    {
      label: "八代の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0236",
    },
    {
      label: "小倉の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0237",
    },
    {
      label: "府内の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0238",
    },
    {
      label: "油津の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0239",
    },
    {
      label: "鹿屋の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0240",
    },
    {
      label: "鹿児島の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0241",
    },
    {
      label: "釜山の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0242",
    },
    {
      label: "寧波の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0243",
    },
    {
      label: "那覇の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0244",
    },
    {
      label: "呂宋の町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0245",
    },
    {
      label: "黒脛巾の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0246",
    },
    {
      label: "羽黒の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0247",
    },
    {
      label: "風魔の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0248",
    },
    {
      label: "戸隠の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0249",
    },
    {
      label: "透波の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0250",
    },
    {
      label: "伊賀の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0251",
    },
    {
      label: "軒猿の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0252",
    },
    {
      label: "甲賀の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0253",
    },
    {
      label: "根来の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0254",
    },
    {
      label: "外聞の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0255",
    },
    {
      label: "鉢屋の里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0256",
    },
    {
      label: "山くぐりの里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0257",
    },
    {
      label: "十三湊砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0258",
    },
    {
      label: "石巻砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0259",
    },
    {
      label: "柏崎砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0260",
    },
    {
      label: "岡本砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0261",
    },
    {
      label: "三崎砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0262",
    },
    {
      label: "清水砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0263",
    },
    {
      label: "舞鶴砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0264",
    },
    {
      label: "鳥羽砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0265",
    },
    {
      label: "洲本砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0266",
    },
    {
      label: "美保関砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0267",
    },
    {
      label: "塩飽砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0268",
    },
    {
      label: "三島砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0269",
    },
    {
      label: "十市砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0270",
    },
    {
      label: "一尺屋砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0271",
    },
    {
      label: "江川砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0272",
    },
    {
      label: "坊津砦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0273",
    },
    {
      label: "目標拠点",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0274",
    },
    {
      label: "発生拠点",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0275",
    },
    {
      label: "主人公拠点",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0276",
    },
    {
      label: "主人公当主拠点",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0277",
    },
    {
      label: "拠点Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0278",
    },
    {
      label: "拠点Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0279",
    },
    {
      label: "拠点Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0280",
    },
    {
      label: "拠点Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0281",
    },
    {
      label: "拠点Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0282",
    },
    {
      label: "主人公居城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0283",
    },
    {
      label: "主人公当主居城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0284",
    },
    {
      label: "城Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0285",
    },
    {
      label: "城Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0286",
    },
    {
      label: "城Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0287",
    },
    {
      label: "城Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0288",
    },
    {
      label: "城Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0289",
    },
    {
      label: "町Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0290",
    },
    {
      label: "町Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0291",
    },
    {
      label: "町Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0292",
    },
    {
      label: "町Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0293",
    },
    {
      label: "町Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0294",
    },
    {
      label: "里Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0295",
    },
    {
      label: "里Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0296",
    },
    {
      label: "里Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0297",
    },
    {
      label: "里Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0298",
    },
    {
      label: "里Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0299",
    },
    {
      label: "砦Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0300",
    },
    {
      label: "砦Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0301",
    },
    {
      label: "砦Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0302",
    },
    {
      label: "砦Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0303",
    },
    {
      label: "砦Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0304",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0305",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("拠点::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionCityData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "宇須岸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "弘前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "花巻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "仙台",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "土崎湊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "酒田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "会津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "鹿島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "足利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "厩橋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "木更津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "佐倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "江戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "小田原",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "直江津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "富山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "輪島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "金沢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "敦賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "小諸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "諏訪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "甲府",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "駿府",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "浜松",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "岡崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "清洲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "井ノ口",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "松倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "大湊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "今浜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "目加田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "奈良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "京",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "亀山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "小浜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "堺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "石山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "雑賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "出石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "鳥取",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "松江",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "温泉津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "姫路",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "津山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "長船",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "倉敷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "尾道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "厳島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "赤間関",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "丸亀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "今治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "鳴門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "浦戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "博多",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "柳川",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "平戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "八代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "小倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "府内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "油津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "鹿屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "鹿児島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "釜山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "寧波",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "那覇",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "呂宋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "町Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "町Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "町Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "町Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "町Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("町::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionCastleData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "勝山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "大浦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "八戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "三戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "九戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "不来方",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "高水寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "岩出山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "寺池",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "名生",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "仙台",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "白石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "湊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "檜山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "角館",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "横手",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "山形",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "鮭延",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "尾浦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "米沢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "黒川",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "二本松",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "須賀川",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "小高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "太田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "水戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "土浦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "小田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "宇都宮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "唐沢山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "小山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "烏山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "厩橋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "沼田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "館林",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "箕輪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "勝浦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "久留里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "稲村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "佐倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "結城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "江戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "岩槻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "河越",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "忍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "八王子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "小田原",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "玉縄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "韮山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "春日山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "新発田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "本庄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "栃尾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "富山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "魚津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "七尾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "尾山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "小松",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "大聖寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "一乗谷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "北ノ庄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "金ヶ崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "戸石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "海津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "飯山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "小諸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "高遠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "木曽福島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "飯田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "躑躅ヶ崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "岩殿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "下山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "駿府",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "興国寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "曳馬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "二俣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "高天神",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "岡崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "長篠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "吉田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "清洲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "鳴海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "小牧山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "那古野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "稲葉山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "墨俣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "大垣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "岩村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "曽根",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "松倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "安濃津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "大河内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "長島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "鳥羽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "小谷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "佐和山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "今浜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "観音寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "坂本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "日野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "多聞山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "信貴山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "大和郡山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "伊賀上野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "勝龍寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "二条",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "丹波亀山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "八上",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "福知山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "宮津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "岸和田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "飯盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "高屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "石山本願",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "芥川",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "有岡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "雑賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "新宮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "鳥取",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "出石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "羽衣石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "月山富田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "三刀屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "白鹿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "益田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "山吹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "置塩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "御着",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "三木",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "上月",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "三星",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "岡山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "砥石山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "天神山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "備中松山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "備中高松",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "三原",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "甲山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "吉田郡山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "佐東銀山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "桜尾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "山口",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "且山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "十河",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "天霧",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "湯築",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "川之江",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "宇和島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "撫養",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "勝瑞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "洲本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "白地",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "岡豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "安芸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "中村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "金石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "立花山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "岩屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "柳川",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "久留米",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "佐嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "大村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "平戸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "日野江",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "岩尾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "隈本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "人吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "八代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "城井谷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "小倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "府内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "岡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "佐伯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "都於郡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "飫肥",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "県",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "大隅高山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "加治木",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "出水",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "主人公居城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "主人公当主居城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "城Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "城Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "城Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "城Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "城Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("城::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionVillageData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "黒脛巾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "羽黒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "風魔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "戸隠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "透波",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "伊賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "軒猿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "甲賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "根来",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "外聞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "鉢屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "山くぐり",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "里Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "里Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "里Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "里Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "里Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("砦::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionSeaFortData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "十三湊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "石巻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "柏崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "岡本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "三崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "清水",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "舞鶴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "鳥羽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "洲本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "美保関",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "塩飽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "三島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "十市",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "一尺屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "江川",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "坊津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "砦Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "砦Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "砦Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "砦Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "砦Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("砦::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionPowerData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "青山忠成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "赤池長任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "赤井直正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "安西又助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "赤尾清綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "明石全登",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "赤穴盛清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "赤松政秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "赤松義祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "秋上久家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "安芸国虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "秋田実季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "秋山虎繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "明智秀満",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "明智光秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "浅井井頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "浅井長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "浅井久政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "朝倉景鏡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "朝倉景健",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "朝倉景恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "朝倉景連",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "朝倉宗滴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "朝倉義景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "浅野長晟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "浅野長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "浅野幸長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "朝比奈泰朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "浅利勝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "足利義昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "足利義氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "足利義輝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "蘆名盛氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "蘆名盛興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "蘆名盛重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "蘆名盛隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "阿蘇惟将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "安宅信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "安宅冬康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "跡部勝資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "穴山小助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "穴山梅雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "姉小路頼綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "阿部正次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "尼子勝久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "尼子晴久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "尼子義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "天野隆重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "天野康景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "雨森弥兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "鮎貝宗重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "荒木氏綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "荒木村重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "有馬晴信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "安国寺恵瓊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "安東高季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "安東愛季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "安藤直次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "安藤守就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "安藤良整",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "飯尾連龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "飯田覚兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "井伊直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "伊賀崎道順",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "伊木忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "池田惣左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "池田恒興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "池田輝政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "池田元助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "池頼和",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "生駒親正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "石川昭光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "石川数正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "石川五右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "石川高信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "石田三成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "石母田景頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "伊集院忠倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "伊集院忠棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "以心崇伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "磯野員昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "板倉勝重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "板部岡江雪斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "伊丹康直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "市川経好",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "一栗放牛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "一条兼定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "一条信龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "伊地知重興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "伊地知重秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "一万田鑑実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "一色義清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "一色義定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "一色義道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "出浦盛清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "伊藤一刀斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "伊東祐兵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "伊藤惣十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "伊東義祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "伊奈忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "稲富一夢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "稲葉一鉄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "稲葉貞通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "稲葉正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "猪苗代盛国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "猪子兵介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "猪俣邦憲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "今井宗久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "今井宗薫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "今川氏真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "今川義元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "宇野藤右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "色部勝長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "色部長実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "岩成友通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "犬童頼安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "上杉景勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "上杉景虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "上杉景信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "上杉謙信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "神屋宗湛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "坂田源右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "鵜飼孫六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "宇喜多忠家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "宇喜多直家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "宇喜多秀家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "宇久純定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "宇久純玄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "宇佐美定満",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "氏家卜全",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "氏家光氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "氏家守棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "氏家行広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "牛尾幸清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "臼杵鑑速",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "宇都宮国綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "宇都宮広綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "鵜殿氏長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "鵜殿長照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "宇山久兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "浦上宗景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "上井覚兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "海野六郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "頴娃久虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "江村親家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "江里口信常",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "円城寺信胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "遠藤直経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "遠藤基信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "大石智久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "大内定綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "大内輝弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "大内義長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "大久保忠佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "大久保忠教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "大久保忠隣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "大久保忠世",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "大久保長安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "大熊朝秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "大崎義隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "大崎義直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "大須賀康高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "太田氏資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "太田牛一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "太田三楽斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "大谷吉継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "大月景秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "大友宗麟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "大友親家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "大友親盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "大友義統",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "大野治長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "大村純忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "小笠原長時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "小笠原少斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "岡家利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "岡部貞綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "岡部正綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "岡部元信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "岡本随縁斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "岡本禅哲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "岡本頼氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "岡吉正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "奥平信昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "奥村永福",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "長船貞親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "長船綱直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "小瀬甫庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
    {
      label: "小田氏治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0188",
    },
    {
      label: "織田有楽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0189",
    },
    {
      label: "織田信勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0190",
    },
    {
      label: "織田信雄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0191",
    },
    {
      label: "織田信包",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0192",
    },
    {
      label: "織田信孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0193",
    },
    {
      label: "織田信忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0194",
    },
    {
      label: "織田信長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0195",
    },
    {
      label: "織田秀信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0196",
    },
    {
      label: "小寺政職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0197",
    },
    {
      label: "小島弥太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0198",
    },
    {
      label: "鬼庭左月",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0199",
    },
    {
      label: "鬼庭綱元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0200",
    },
    {
      label: "小野鎮幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0201",
    },
    {
      label: "小野善鬼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0202",
    },
    {
      label: "小野忠明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0203",
    },
    {
      label: "小野寺輝道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0204",
    },
    {
      label: "小野寺義道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0205",
    },
    {
      label: "小幡勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0206",
    },
    {
      label: "小浜景隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0207",
    },
    {
      label: "飯富虎昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0208",
    },
    {
      label: "小山田信茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0209",
    },
    {
      label: "甲斐宗運",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0210",
    },
    {
      label: "海北綱親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0211",
    },
    {
      label: "香川親和",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0212",
    },
    {
      label: "香川元景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0213",
    },
    {
      label: "柿崎景家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0214",
    },
    {
      label: "蠣崎季広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0215",
    },
    {
      label: "蠣崎慶広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0216",
    },
    {
      label: "垣屋光成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0217",
    },
    {
      label: "筧十蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0218",
    },
    {
      label: "葛西晴信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0219",
    },
    {
      label: "笠原政堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0220",
    },
    {
      label: "梶原景宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0221",
    },
    {
      label: "果心居士",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0222",
    },
    {
      label: "糟谷武則",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0223",
    },
    {
      label: "片桐且元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0224",
    },
    {
      label: "片倉景綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0225",
    },
    {
      label: "佐甲藤太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0226",
    },
    {
      label: "堅田元慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0227",
    },
    {
      label: "桂元澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0228",
    },
    {
      label: "葛山氏元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0229",
    },
    {
      label: "加藤清正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0230",
    },
    {
      label: "加藤段蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0231",
    },
    {
      label: "加藤光泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0232",
    },
    {
      label: "加藤嘉明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0233",
    },
    {
      label: "金上盛備",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0234",
    },
    {
      label: "金森長近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0235",
    },
    {
      label: "可児才蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0236",
    },
    {
      label: "鐘捲自斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0237",
    },
    {
      label: "蒲池鑑盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0238",
    },
    {
      label: "亀井茲矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0239",
    },
    {
      label: "蒲生氏郷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0240",
    },
    {
      label: "蒲生賢秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0241",
    },
    {
      label: "蒲生定秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0242",
    },
    {
      label: "蒲生頼郷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0243",
    },
    {
      label: "蒲生秀行",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0244",
    },
    {
      label: "川上忠智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0245",
    },
    {
      label: "川上久朗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0246",
    },
    {
      label: "河尻秀隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0247",
    },
    {
      label: "河田長親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0248",
    },
    {
      label: "願証寺証恵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0249",
    },
    {
      label: "神戸具盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0250",
    },
    {
      label: "菅達長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0251",
    },
    {
      label: "城井鎮房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0252",
    },
    {
      label: "喜入季久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0253",
    },
    {
      label: "木曽義昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0254",
    },
    {
      label: "木曽義康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0255",
    },
    {
      label: "北条景広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0256",
    },
    {
      label: "北条高広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0257",
    },
    {
      label: "北信愛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0258",
    },
    {
      label: "北畠具教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0259",
    },
    {
      label: "北畠具房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0260",
    },
    {
      label: "北畠晴具",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0261",
    },
    {
      label: "吉川経家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0262",
    },
    {
      label: "吉川広家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0263",
    },
    {
      label: "吉川元長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0264",
    },
    {
      label: "吉川元春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0265",
    },
    {
      label: "木下昌直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0266",
    },
    {
      label: "木村重成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0267",
    },
    {
      label: "肝付兼続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0268",
    },
    {
      label: "肝付兼護",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0269",
    },
    {
      label: "肝付良兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0270",
    },
    {
      label: "京極高次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0271",
    },
    {
      label: "京極高知",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0272",
    },
    {
      label: "京極高吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0273",
    },
    {
      label: "吉良親貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0274",
    },
    {
      label: "吉良親実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0275",
    },
    {
      label: "霧隠才蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0276",
    },
    {
      label: "九鬼広隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0277",
    },
    {
      label: "九鬼守隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0278",
    },
    {
      label: "九鬼嘉隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0279",
    },
    {
      label: "楠長諳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0280",
    },
    {
      label: "口羽通良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0281",
    },
    {
      label: "朽木元綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0282",
    },
    {
      label: "国司元相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0283",
    },
    {
      label: "国友善兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0284",
    },
    {
      label: "九戸政実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0285",
    },
    {
      label: "熊谷信直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0286",
    },
    {
      label: "組屋源四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0287",
    },
    {
      label: "末吉孫左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0288",
    },
    {
      label: "蔵田五郎左",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0289",
    },
    {
      label: "来島通総",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0290",
    },
    {
      label: "村上通康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0291",
    },
    {
      label: "黒田如水",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0292",
    },
    {
      label: "黒田長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0293",
    },
    {
      label: "黒田職隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0294",
    },
    {
      label: "桑名吉成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0295",
    },
    {
      label: "上泉信綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0296",
    },
    {
      label: "高坂甚内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0297",
    },
    {
      label: "高坂昌信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0298",
    },
    {
      label: "香宗我部親泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0299",
    },
    {
      label: "河野牛福丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0300",
    },
    {
      label: "河野通宣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0301",
    },
    {
      label: "高力清長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0302",
    },
    {
      label: "小島職鎮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0303",
    },
    {
      label: "五代友喜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0304",
    },
    {
      label: "児玉就英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0305",
    },
    {
      label: "木造具政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0306",
    },
    {
      label: "籠手田安一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0307",
    },
    {
      label: "籠手田安経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0308",
    },
    {
      label: "後藤賢豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0309",
    },
    {
      label: "後藤信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0310",
    },
    {
      label: "後藤又兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0311",
    },
    {
      label: "小西行長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0312",
    },
    {
      label: "小西隆佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0313",
    },
    {
      label: "小早川隆景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0314",
    },
    {
      label: "小早川秀秋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0315",
    },
    {
      label: "小早川秀包",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0316",
    },
    {
      label: "小堀遠州",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0317",
    },
    {
      label: "小梁川盛宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0318",
    },
    {
      label: "近藤義武",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0319",
    },
    {
      label: "西園寺公広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0320",
    },
    {
      label: "雑賀孫一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0321",
    },
    {
      label: "斎藤龍興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0322",
    },
    {
      label: "斎藤伝鬼坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0323",
    },
    {
      label: "斎藤道三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0324",
    },
    {
      label: "斎藤利三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0325",
    },
    {
      label: "斎藤朝信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0326",
    },
    {
      label: "斎藤義龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0327",
    },
    {
      label: "斎村政広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0328",
    },
    {
      label: "佐伯惟定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0329",
    },
    {
      label: "吉田印西",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0330",
    },
    {
      label: "酒井家次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0331",
    },
    {
      label: "酒井忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0332",
    },
    {
      label: "酒井忠世",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0333",
    },
    {
      label: "坂井政尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0334",
    },
    {
      label: "榊原康政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0335",
    },
    {
      label: "坂崎直盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0336",
    },
    {
      label: "相良義陽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0337",
    },
    {
      label: "相良頼房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0338",
    },
    {
      label: "佐久間信盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0339",
    },
    {
      label: "佐久間盛重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0340",
    },
    {
      label: "佐久間盛政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0341",
    },
    {
      label: "鮭延秀綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0342",
    },
    {
      label: "佐々木小次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0343",
    },
    {
      label: "笹部勘二郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0344",
    },
    {
      label: "佐世元嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0345",
    },
    {
      label: "佐竹義昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0346",
    },
    {
      label: "佐竹義重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0347",
    },
    {
      label: "佐竹義宣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0348",
    },
    {
      label: "佐竹義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0349",
    },
    {
      label: "佐田彦四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0350",
    },
    {
      label: "佐々成政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0351",
    },
    {
      label: "里見義堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0352",
    },
    {
      label: "里見義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0353",
    },
    {
      label: "里見義康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0354",
    },
    {
      label: "里見義頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0355",
    },
    {
      label: "真田信綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0356",
    },
    {
      label: "真田信幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0357",
    },
    {
      label: "真田昌輝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0358",
    },
    {
      label: "真田昌幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0359",
    },
    {
      label: "真田幸隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0360",
    },
    {
      label: "真田幸村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0361",
    },
    {
      label: "佐野房綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0362",
    },
    {
      label: "佐分利猪之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0363",
    },
    {
      label: "猿飛佐助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0364",
    },
    {
      label: "猿渡信光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0365",
    },
    {
      label: "山本寺定長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0366",
    },
    {
      label: "椎名康胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0367",
    },
    {
      label: "志賀親次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0368",
    },
    {
      label: "志賀親守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0369",
    },
    {
      label: "繁沢元氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0370",
    },
    {
      label: "宍戸隆家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0371",
    },
    {
      label: "宍戸梅軒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0372",
    },
    {
      label: "宍戸元続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0373",
    },
    {
      label: "七条兼仲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0374",
    },
    {
      label: "七里頼周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0375",
    },
    {
      label: "篠原長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0376",
    },
    {
      label: "斯波詮直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0377",
    },
    {
      label: "斯波詮真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0378",
    },
    {
      label: "柴田勝家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0379",
    },
    {
      label: "柴田勝豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0380",
    },
    {
      label: "新発田重家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0381",
    },
    {
      label: "新発田長敦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0382",
    },
    {
      label: "芝辻清右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0383",
    },
    {
      label: "渋谷与右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0384",
    },
    {
      label: "島井宗室",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0385",
    },
    {
      label: "島左近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0386",
    },
    {
      label: "島津家久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0387",
    },
    {
      label: "島津日新斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0388",
    },
    {
      label: "島津貴久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0389",
    },
    {
      label: "島津忠恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0390",
    },
    {
      label: "島津歳久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0391",
    },
    {
      label: "島津豊久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0392",
    },
    {
      label: "島津義虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0393",
    },
    {
      label: "島津義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0394",
    },
    {
      label: "島津義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0395",
    },
    {
      label: "清水宗治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0396",
    },
    {
      label: "清水康英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0397",
    },
    {
      label: "志村光安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0398",
    },
    {
      label: "下間仲孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0399",
    },
    {
      label: "下間頼照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0400",
    },
    {
      label: "下間頼廉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0401",
    },
    {
      label: "上条政繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0402",
    },
    {
      label: "白石宗実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0403",
    },
    {
      label: "神西元通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0404",
    },
    {
      label: "神保氏張",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0405",
    },
    {
      label: "神保長住",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0406",
    },
    {
      label: "神保長城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0407",
    },
    {
      label: "神保長職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0408",
    },
    {
      label: "陶晴賢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0409",
    },
    {
      label: "菅沼定盈",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0410",
    },
    {
      label: "杉谷善住坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0411",
    },
    {
      label: "杉之坊照算",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0412",
    },
    {
      label: "鈴木佐太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0413",
    },
    {
      label: "鈴木重朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0414",
    },
    {
      label: "薄田兼相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0415",
    },
    {
      label: "鈴木元信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0416",
    },
    {
      label: "須田満親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0417",
    },
    {
      label: "津田宗及",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0418",
    },
    {
      label: "角倉素庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0419",
    },
    {
      label: "角倉了以",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0420",
    },
    {
      label: "関一政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0421",
    },
    {
      label: "関口氏広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0422",
    },
    {
      label: "世鬼政時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0423",
    },
    {
      label: "関盛信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0424",
    },
    {
      label: "仙石秀久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0425",
    },
    {
      label: "千利休",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0426",
    },
    {
      label: "相馬盛胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0427",
    },
    {
      label: "相馬義胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0428",
    },
    {
      label: "宗義調",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0429",
    },
    {
      label: "宗義智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0430",
    },
    {
      label: "十河一存",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0431",
    },
    {
      label: "十河存保",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0432",
    },
    {
      label: "太原雪斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0433",
    },
    {
      label: "大道寺政繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0434",
    },
    {
      label: "大宝寺義氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0435",
    },
    {
      label: "高島正重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0436",
    },
    {
      label: "高梨政頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0437",
    },
    {
      label: "高橋鑑種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0438",
    },
    {
      label: "高橋紹運",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0439",
    },
    {
      label: "高山重友",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0440",
    },
    {
      label: "高山友照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0441",
    },
    {
      label: "滝川一益",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0442",
    },
    {
      label: "滝川雄利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0443",
    },
    {
      label: "田北鎮周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0444",
    },
    {
      label: "滝本寺非有",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0445",
    },
    {
      label: "武井夕庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0446",
    },
    {
      label: "武田勝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0447",
    },
    {
      label: "武田逍遙軒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0448",
    },
    {
      label: "武田信玄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0449",
    },
    {
      label: "武田信繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0450",
    },
    {
      label: "武田信豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0451",
    },
    {
      label: "武田元明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0452",
    },
    {
      label: "武田義信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0453",
    },
    {
      label: "竹中重門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0454",
    },
    {
      label: "竹中半兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0455",
    },
    {
      label: "立花道雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0456",
    },
    {
      label: "立花直次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0457",
    },
    {
      label: "立花宗茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0458",
    },
    {
      label: "立原久綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0459",
    },
    {
      label: "楯岡満茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0460",
    },
    {
      label: "伊達実元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0461",
    },
    {
      label: "伊達成実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0462",
    },
    {
      label: "伊達稙宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0463",
    },
    {
      label: "伊達輝宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0464",
    },
    {
      label: "伊達晴宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0465",
    },
    {
      label: "伊達政宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0466",
    },
    {
      label: "田中勝助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0467",
    },
    {
      label: "田中吉政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0468",
    },
    {
      label: "谷忠澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0469",
    },
    {
      label: "種子島時堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0470",
    },
    {
      label: "種子島久時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0471",
    },
    {
      label: "田村清顕",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0472",
    },
    {
      label: "多羅尾光俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0473",
    },
    {
      label: "田原親賢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0474",
    },
    {
      label: "千賀孫兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0475",
    },
    {
      label: "千坂景親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0476",
    },
    {
      label: "千葉邦胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0477",
    },
    {
      label: "千葉胤富",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0478",
    },
    {
      label: "茶屋又四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0479",
    },
    {
      label: "茶屋四郎次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0480",
    },
    {
      label: "長宗我部国親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0481",
    },
    {
      label: "長宗我部信親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0482",
    },
    {
      label: "長宗我部元親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0483",
    },
    {
      label: "長宗我部盛親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0484",
    },
    {
      label: "長続連",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0485",
    },
    {
      label: "長連龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0486",
    },
    {
      label: "塚原卜伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0487",
    },
    {
      label: "津軽為信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0488",
    },
    {
      label: "柘植三之丞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0489",
    },
    {
      label: "津田信澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0490",
    },
    {
      label: "土屋昌恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0491",
    },
    {
      label: "筒井定次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0492",
    },
    {
      label: "筒井順慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0493",
    },
    {
      label: "角隈石宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0494",
    },
    {
      label: "津野親忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0495",
    },
    {
      label: "土居宗珊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0496",
    },
    {
      label: "土井利勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0497",
    },
    {
      label: "東郷重位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0498",
    },
    {
      label: "藤堂高虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0499",
    },
    {
      label: "遠山景任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0500",
    },
    {
      label: "遠山綱景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0501",
    },
    {
      label: "戸川秀安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0502",
    },
    {
      label: "戸川逵安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0503",
    },
    {
      label: "土岐頼次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0504",
    },
    {
      label: "得居通之",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0505",
    },
    {
      label: "徳川家康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0506",
    },
    {
      label: "徳川信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0507",
    },
    {
      label: "徳川秀忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0508",
    },
    {
      label: "戸沢盛安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0509",
    },
    {
      label: "富田景政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0510",
    },
    {
      label: "富田重政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0511",
    },
    {
      label: "富田勢源",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0512",
    },
    {
      label: "富田隆実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0513",
    },
    {
      label: "富永山随",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0514",
    },
    {
      label: "豊臣秀次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0515",
    },
    {
      label: "豊臣秀長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0516",
    },
    {
      label: "豊臣秀吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0517",
    },
    {
      label: "豊臣秀頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0518",
    },
    {
      label: "鳥居強右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0519",
    },
    {
      label: "鳥居忠吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0520",
    },
    {
      label: "鳥居元忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0521",
    },
    {
      label: "内藤如安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0522",
    },
    {
      label: "内藤昌豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0523",
    },
    {
      label: "内藤正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0524",
    },
    {
      label: "直江景綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0525",
    },
    {
      label: "直江兼続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0526",
    },
    {
      label: "長井道利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0527",
    },
    {
      label: "長尾政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0528",
    },
    {
      label: "中川清秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0529",
    },
    {
      label: "長坂釣閑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0530",
    },
    {
      label: "中島重房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0531",
    },
    {
      label: "中島可之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0532",
    },
    {
      label: "中条景泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0533",
    },
    {
      label: "永田徳本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0534",
    },
    {
      label: "長野具藤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0535",
    },
    {
      label: "長野業正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0536",
    },
    {
      label: "長野業盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0537",
    },
    {
      label: "中野宗時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0538",
    },
    {
      label: "中村一氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0539",
    },
    {
      label: "道川兵衛三郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0540",
    },
    {
      label: "中山朝正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0541",
    },
    {
      label: "名古屋山三郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0542",
    },
    {
      label: "奈佐日本助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0543",
    },
    {
      label: "那須資晴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0544",
    },
    {
      label: "長束正家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0545",
    },
    {
      label: "夏目吉信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0546",
    },
    {
      label: "鍋島勝茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0547",
    },
    {
      label: "鍋島直茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0548",
    },
    {
      label: "呂宋助左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0549",
    },
    {
      label: "成田氏長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0550",
    },
    {
      label: "成田長忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0551",
    },
    {
      label: "成田長泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0552",
    },
    {
      label: "成松信勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0553",
    },
    {
      label: "成富茂安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0554",
    },
    {
      label: "南部利直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0555",
    },
    {
      label: "南部信直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0556",
    },
    {
      label: "南部晴政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0557",
    },
    {
      label: "新納忠元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0558",
    },
    {
      label: "西川仁右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0559",
    },
    {
      label: "仁科盛信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0560",
    },
    {
      label: "二曲輪猪助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0561",
    },
    {
      label: "二宮就辰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0562",
    },
    {
      label: "二本松義継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0563",
    },
    {
      label: "丹羽長重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0564",
    },
    {
      label: "丹羽長秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0565",
    },
    {
      label: "温井景隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0566",
    },
    {
      label: "沼田祐光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0567",
    },
    {
      label: "根岸兎角",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0568",
    },
    {
      label: "禰寝重長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0569",
    },
    {
      label: "根津甚八",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0570",
    },
    {
      label: "乃美宗勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0571",
    },
    {
      label: "拝郷家嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0572",
    },
    {
      label: "垪和氏続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0573",
    },
    {
      label: "芳賀高定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0574",
    },
    {
      label: "芳賀高継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0575",
    },
    {
      label: "友野二郎兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0576",
    },
    {
      label: "支倉常長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0577",
    },
    {
      label: "畠山高政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0578",
    },
    {
      label: "畠山義続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0579",
    },
    {
      label: "畠山義綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0580",
    },
    {
      label: "波多野晴通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0581",
    },
    {
      label: "波多野秀尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0582",
    },
    {
      label: "波多野秀治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0583",
    },
    {
      label: "蜂須賀家政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0584",
    },
    {
      label: "蜂須賀小六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0585",
    },
    {
      label: "蜂屋頼隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0586",
    },
    {
      label: "服部半蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0587",
    },
    {
      label: "堀立直正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0588",
    },
    {
      label: "花房正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0589",
    },
    {
      label: "花房正幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0590",
    },
    {
      label: "花房職秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0591",
    },
    {
      label: "馬場信春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0592",
    },
    {
      label: "林崎甚助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0593",
    },
    {
      label: "林秀貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0594",
    },
    {
      label: "原田宗時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0595",
    },
    {
      label: "原虎胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0596",
    },
    {
      label: "原昌胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0597",
    },
    {
      label: "播磨屋宗徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0598",
    },
    {
      label: "塙直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0599",
    },
    {
      label: "塙団右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0600",
    },
    {
      label: "疋田豊五郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0601",
    },
    {
      label: "久武親直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0602",
    },
    {
      label: "久武親信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0603",
    },
    {
      label: "鴻池新六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0604",
    },
    {
      label: "日根野弘就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0605",
    },
    {
      label: "百武賢兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0606",
    },
    {
      label: "平井経治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0607",
    },
    {
      label: "平岩親吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0608",
    },
    {
      label: "平岡房実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0609",
    },
    {
      label: "平賀元相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0610",
    },
    {
      label: "平手汎秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0611",
    },
    {
      label: "平野長泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0612",
    },
    {
      label: "風魔小太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0613",
    },
    {
      label: "深水長智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0614",
    },
    {
      label: "福島正則",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0615",
    },
    {
      label: "福留親政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0616",
    },
    {
      label: "福留儀重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0617",
    },
    {
      label: "福原貞俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0618",
    },
    {
      label: "古田織部",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0619",
    },
    {
      label: "不破光治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0620",
    },
    {
      label: "別所長治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0621",
    },
    {
      label: "穂井田元清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0622",
    },
    {
      label: "北条氏勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0623",
    },
    {
      label: "北条氏邦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0624",
    },
    {
      label: "北条氏繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0625",
    },
    {
      label: "北条氏照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0626",
    },
    {
      label: "北条氏直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0627",
    },
    {
      label: "北条氏規",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0628",
    },
    {
      label: "北条氏政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0629",
    },
    {
      label: "北条氏康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0630",
    },
    {
      label: "北条幻庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0631",
    },
    {
      label: "北条綱成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0632",
    },
    {
      label: "宝蔵院胤栄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0633",
    },
    {
      label: "保科正俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0634",
    },
    {
      label: "安井道頓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0635",
    },
    {
      label: "細川忠興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0636",
    },
    {
      label: "細川晴元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0637",
    },
    {
      label: "細川幽斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0638",
    },
    {
      label: "堀尾忠氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0639",
    },
    {
      label: "堀尾吉晴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0640",
    },
    {
      label: "堀直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0641",
    },
    {
      label: "堀内氏善",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0642",
    },
    {
      label: "堀秀治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0643",
    },
    {
      label: "堀秀政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0644",
    },
    {
      label: "本因坊算砂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0645",
    },
    {
      label: "本願寺教如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0646",
    },
    {
      label: "本願寺顕如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0647",
    },
    {
      label: "本願寺准如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0648",
    },
    {
      label: "北郷時久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0649",
    },
    {
      label: "本庄繁長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0650",
    },
    {
      label: "本多重次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0651",
    },
    {
      label: "本多忠勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0652",
    },
    {
      label: "本多忠朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0653",
    },
    {
      label: "本多忠政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0654",
    },
    {
      label: "本多正純",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0655",
    },
    {
      label: "本多正信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0656",
    },
    {
      label: "前田慶次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0657",
    },
    {
      label: "前田玄以",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0658",
    },
    {
      label: "前田利家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0659",
    },
    {
      label: "前田利長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0660",
    },
    {
      label: "前田利政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0661",
    },
    {
      label: "前野長康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0662",
    },
    {
      label: "前波吉継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0663",
    },
    {
      label: "真壁氏幹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0664",
    },
    {
      label: "真柄直澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0665",
    },
    {
      label: "真柄直隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0666",
    },
    {
      label: "正木時茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0667",
    },
    {
      label: "正木時忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0668",
    },
    {
      label: "正木頼忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0669",
    },
    {
      label: "増田長盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0670",
    },
    {
      label: "益田元祥",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0671",
    },
    {
      label: "松井康之",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0672",
    },
    {
      label: "松井友閑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0673",
    },
    {
      label: "松倉重信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0674",
    },
    {
      label: "松倉重政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0675",
    },
    {
      label: "松下加兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0676",
    },
    {
      label: "松平忠吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0677",
    },
    {
      label: "松田憲秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0678",
    },
    {
      label: "松永久秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0679",
    },
    {
      label: "松永久通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0680",
    },
    {
      label: "松波義親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0681",
    },
    {
      label: "角屋七郎次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0682",
    },
    {
      label: "松浦鎮信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0683",
    },
    {
      label: "松浦隆信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0684",
    },
    {
      label: "曲直瀬道三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0685",
    },
    {
      label: "丸目長恵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0686",
    },
    {
      label: "三雲成持",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0687",
    },
    {
      label: "御宿勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0688",
    },
    {
      label: "水谷胤重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0689",
    },
    {
      label: "水野勝成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0690",
    },
    {
      label: "水野忠重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0691",
    },
    {
      label: "水野信元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0692",
    },
    {
      label: "溝尾庄兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0693",
    },
    {
      label: "溝口秀勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0694",
    },
    {
      label: "三刀屋久祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0695",
    },
    {
      label: "三村家親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0696",
    },
    {
      label: "三村元親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0697",
    },
    {
      label: "宮部継潤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0698",
    },
    {
      label: "宮本伝太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0699",
    },
    {
      label: "宮本武蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0700",
    },
    {
      label: "三好笑巌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0701",
    },
    {
      label: "三好長治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0702",
    },
    {
      label: "三好長逸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0703",
    },
    {
      label: "三好長慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0704",
    },
    {
      label: "三好為三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0705",
    },
    {
      label: "三好宗渭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0706",
    },
    {
      label: "三好義興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0707",
    },
    {
      label: "三好実休",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0708",
    },
    {
      label: "三好義継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0709",
    },
    {
      label: "向井正綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0710",
    },
    {
      label: "村井貞勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0711",
    },
    {
      label: "村井長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0712",
    },
    {
      label: "村上国清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0713",
    },
    {
      label: "村上武吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0714",
    },
    {
      label: "村上元吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0715",
    },
    {
      label: "村上義清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0716",
    },
    {
      label: "毛受勝照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0717",
    },
    {
      label: "毛利勝永",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0718",
    },
    {
      label: "毛利重能",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0719",
    },
    {
      label: "毛利隆元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0720",
    },
    {
      label: "毛利輝元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0721",
    },
    {
      label: "毛利元就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0722",
    },
    {
      label: "最上義光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0723",
    },
    {
      label: "最上義時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0724",
    },
    {
      label: "最上義守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0725",
    },
    {
      label: "望月六郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0726",
    },
    {
      label: "本山茂宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0727",
    },
    {
      label: "籾井教業",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0728",
    },
    {
      label: "百地三太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0729",
    },
    {
      label: "森下道誉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0730",
    },
    {
      label: "森忠政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0731",
    },
    {
      label: "母里太兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0732",
    },
    {
      label: "森長可",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0733",
    },
    {
      label: "森村春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0734",
    },
    {
      label: "森可成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0735",
    },
    {
      label: "森蘭丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0736",
    },
    {
      label: "師岡一羽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0737",
    },
    {
      label: "問註所統景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0738",
    },
    {
      label: "八板金兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0739",
    },
    {
      label: "柳生石舟斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0740",
    },
    {
      label: "柳生兵庫助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0741",
    },
    {
      label: "柳生宗矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0742",
    },
    {
      label: "施薬院全宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0743",
    },
    {
      label: "矢沢頼綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0744",
    },
    {
      label: "矢沢頼康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0745",
    },
    {
      label: "屋代景頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0746",
    },
    {
      label: "安田顕元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0747",
    },
    {
      label: "安田長秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0748",
    },
    {
      label: "柳原戸兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0749",
    },
    {
      label: "山県昌景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0750",
    },
    {
      label: "山崎片家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0751",
    },
    {
      label: "山崎長徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0752",
    },
    {
      label: "山田有信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0753",
    },
    {
      label: "山田長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0754",
    },
    {
      label: "山田宗昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0755",
    },
    {
      label: "山中鹿介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0756",
    },
    {
      label: "山中俊好",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0757",
    },
    {
      label: "山名祐豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0758",
    },
    {
      label: "山名禅高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0759",
    },
    {
      label: "山内一豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0760",
    },
    {
      label: "山本勘助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0761",
    },
    {
      label: "湯浅五助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0762",
    },
    {
      label: "結城晴朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0763",
    },
    {
      label: "結城秀康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0764",
    },
    {
      label: "結城政勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0765",
    },
    {
      label: "遊佐続光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0766",
    },
    {
      label: "由利鎌之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0767",
    },
    {
      label: "横谷左近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0768",
    },
    {
      label: "吉江景資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0769",
    },
    {
      label: "吉岡憲法",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0770",
    },
    {
      label: "吉岡清十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0771",
    },
    {
      label: "吉岡伝七郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0772",
    },
    {
      label: "吉岡長増",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0773",
    },
    {
      label: "吉田重俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0774",
    },
    {
      label: "吉田孝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0775",
    },
    {
      label: "吉田政重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0776",
    },
    {
      label: "吉田康俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0777",
    },
    {
      label: "吉弘鑑理",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0778",
    },
    {
      label: "吉見正頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0779",
    },
    {
      label: "世瀬蔵人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0780",
    },
    {
      label: "淀屋常安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0781",
    },
    {
      label: "簗田藤左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0782",
    },
    {
      label: "依岡左京",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0783",
    },
    {
      label: "龍造寺家就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0784",
    },
    {
      label: "龍造寺隆信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0785",
    },
    {
      label: "龍造寺長信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0786",
    },
    {
      label: "龍造寺信周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0787",
    },
    {
      label: "龍造寺政家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0788",
    },
    {
      label: "留守政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0789",
    },
    {
      label: "六角承禎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0790",
    },
    {
      label: "六角義治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0791",
    },
    {
      label: "若林鎮興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0792",
    },
    {
      label: "脇坂安治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0793",
    },
    {
      label: "分部光嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0794",
    },
    {
      label: "和田昭為",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0795",
    },
    {
      label: "和田惟政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0796",
    },
    {
      label: "渡辺勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0797",
    },
    {
      label: "渡辺守綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0798",
    },
    {
      label: "亘理元宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0799",
    },
    {
      label: "上杉憲政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0800",
    },
    {
      label: "武田信虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0801",
    },
    {
      label: "大内義隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0802",
    },
    {
      label: "織田信秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0803",
    },
    {
      label: "松平広忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0804",
    },
    {
      label: "平手政秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0805",
    },
    {
      label: "九鬼浄隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0806",
    },
    {
      label: "畠山秋高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0807",
    },
    {
      label: "赤松晴政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0808",
    },
    {
      label: "少弐冬尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0809",
    },
    {
      label: "有馬義貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0810",
    },
    {
      label: "大友義鑑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0811",
    },
    {
      label: "本願寺証如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0812",
    },
    {
      label: "大宝寺義増",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0813",
    },
    {
      label: "斯波義統",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0814",
    },
    {
      label: "織田信友",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0815",
    },
    {
      label: "細川氏綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0816",
    },
    {
      label: "六角定頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0817",
    },
    {
      label: "島津勝久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0818",
    },
    {
      label: "筒井順昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0819",
    },
    {
      label: "二階堂盛義",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0820",
    },
    {
      label: "一宮随波斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0821",
    },
    {
      label: "有馬晴純",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0822",
    },
    {
      label: "相良晴広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0823",
    },
    {
      label: "村上吉充",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0824",
    },
    {
      label: "岩間小熊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0825",
    },
    {
      label: "梶原政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0826",
    },
    {
      label: "松永長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0827",
    },
    {
      label: "毛利秀元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0828",
    },
    {
      label: "大谷休泊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0829",
    },
    {
      label: "遊佐信教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0830",
    },
    {
      label: "田北紹鉄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0831",
    },
    {
      label: "冷泉隆豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0832",
    },
    {
      label: "相良武任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0833",
    },
    {
      label: "飯田興秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0834",
    },
    {
      label: "児玉就方",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0835",
    },
    {
      label: "白井賢胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0836",
    },
    {
      label: "織田信光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0837",
    },
    {
      label: "小山田信有",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0838",
    },
    {
      label: "尼子国久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0839",
    },
    {
      label: "尼子誠久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0840",
    },
    {
      label: "坂井大膳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0841",
    },
    {
      label: "別所就治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0842",
    },
    {
      label: "志道広良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0843",
    },
    {
      label: "鍋島清房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0844",
    },
    {
      label: "神屋紹策",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0845",
    },
    {
      label: "内藤興盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0846",
    },
    {
      label: "島津実久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0847",
    },
    {
      label: "井上元兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0848",
    },
    {
      label: "津田宗達",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0849",
    },
    {
      label: "阿蘇惟豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0850",
    },
    {
      label: "津田算長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0851",
    },
    {
      label: "杉重矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0852",
    },
    {
      label: "城井長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0853",
    },
    {
      label: "葛西晴胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0854",
    },
    {
      label: "江上武種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0855",
    },
    {
      label: "佐伯惟教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0856",
    },
    {
      label: "宇久玄雅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0857",
    },
    {
      label: "二木重高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0858",
    },
    {
      label: "高田又兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0859",
    },
    {
      label: "大宝寺義興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0860",
    },
    {
      label: "大野治房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0861",
    },
    {
      label: "水原親憲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0862",
    },
    {
      label: "津軽信枚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0863",
    },
    {
      label: "小山田茂誠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0864",
    },
    {
      label: "十時連貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0865",
    },
    {
      label: "井伊直孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0866",
    },
    {
      label: "片倉重長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0867",
    },
    {
      label: "成田長親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0868",
    },
    {
      label: "最上家親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0869",
    },
    {
      label: "上田重安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0870",
    },
    {
      label: "小梁川宗朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0871",
    },
    {
      label: "大国実頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0872",
    },
    {
      label: "梅津政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0873",
    },
    {
      label: "三淵藤英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0874",
    },
    {
      label: "本多政重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0875",
    },
    {
      label: "栗山善助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0876",
    },
    {
      label: "多賀谷政広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0877",
    },
    {
      label: "土岐為頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0878",
    },
    {
      label: "舞兵庫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0879",
    },
    {
      label: "山上道及",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0880",
    },
    {
      label: "蜂須賀至鎮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0881",
    },
    {
      label: "真田信尹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0882",
    },
    {
      label: "伊東マンショ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0883",
    },
    {
      label: "宮部長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0884",
    },
    {
      label: "朝比奈信置",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0885",
    },
    {
      label: "金森可重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0886",
    },
    {
      label: "斯波義銀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0887",
    },
    {
      label: "毛利秀頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0888",
    },
    {
      label: "津川義冬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0889",
    },
    {
      label: "留守顕宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0890",
    },
    {
      label: "原長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0891",
    },
    {
      label: "平塚為広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0892",
    },
    {
      label: "妻木広忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0893",
    },
    {
      label: "鳥屋尾満栄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0894",
    },
    {
      label: "野村直隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0895",
    },
    {
      label: "土居清良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0896",
    },
    {
      label: "島津忠直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0897",
    },
    {
      label: "一柳直末",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0898",
    },
    {
      label: "三木直頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0899",
    },
    {
      label: "杉浦玄任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0900",
    },
    {
      label: "色部顕長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0901",
    },
    {
      label: "中条藤資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0902",
    },
    {
      label: "江上家種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0903",
    },
    {
      label: "甘粕景継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0904",
    },
    {
      label: "安田作兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0905",
    },
    {
      label: "河野通直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0906",
    },
    {
      label: "姉小路良頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0907",
    },
    {
      label: "竹中久作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0908",
    },
    {
      label: "阿閉貞征",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0909",
    },
    {
      label: "森田浄雲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0910",
    },
    {
      label: "熊谷元直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0911",
    },
    {
      label: "明智光安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0912",
    },
    {
      label: "別所重棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0913",
    },
    {
      label: "小川祐忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0914",
    },
    {
      label: "吉弘鎮信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0915",
    },
    {
      label: "佃十成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0916",
    },
    {
      label: "大谷吉治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0917",
    },
    {
      label: "有馬豊氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0918",
    },
    {
      label: "神代勝利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0919",
    },
    {
      label: "赤星統家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0920",
    },
    {
      label: "伊集院忠朗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0921",
    },
    {
      label: "樺山久高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0922",
    },
    {
      label: "藤田信吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0923",
    },
    {
      label: "間宮康俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0924",
    },
    {
      label: "由布惟信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0925",
    },
    {
      label: "小浜光隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0926",
    },
    {
      label: "天草四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0927",
    },
    {
      label: "船越景直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0928",
    },
    {
      label: "伊達小次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0929",
    },
    {
      label: "金光文右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0930",
    },
    {
      label: "友野宗善",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0931",
    },
    {
      label: "多米元忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0932",
    },
    {
      label: "宇野源十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0933",
    },
    {
      label: "津田宗凡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0934",
    },
    {
      label: "末次平蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0935",
    },
    {
      label: "甘粕景持",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0936",
    },
    {
      label: "山崎吉家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0937",
    },
    {
      label: "唐沢玄蕃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0938",
    },
    {
      label: "植田光次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0939",
    },
    {
      label: "大林坊俊海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0940",
    },
    {
      label: "内田トメ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0941",
    },
    {
      label: "奥弥兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0942",
    },
    {
      label: "秦泉寺豊後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0943",
    },
    {
      label: "後藤宗印",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0944",
    },
    {
      label: "愛洲元香斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0945",
    },
    {
      label: "上泉泰綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0946",
    },
    {
      label: "瀬戸方久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0947",
    },
    {
      label: "蘇我理右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0948",
    },
    {
      label: "松下常慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0949",
    },
    {
      label: "曲直瀬玄朔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0950",
    },
    {
      label: "三枝昌貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0951",
    },
    {
      label: "石田正澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0952",
    },
    {
      label: "一柳直盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0953",
    },
    {
      label: "駒井高白斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0954",
    },
    {
      label: "鎌田政年",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0955",
    },
    {
      label: "清水景治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0956",
    },
    {
      label: "千々石ミゲル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0957",
    },
    {
      label: "弥助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0958",
    },
    {
      label: "三浦按針",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0959",
    },
    {
      label: "鐙屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0960",
    },
    {
      label: "伊藤屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0961",
    },
    {
      label: "納屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0962",
    },
    {
      label: "組屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0963",
    },
    {
      label: "下関屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0964",
    },
    {
      label: "越後屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0965",
    },
    {
      label: "小西屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0966",
    },
    {
      label: "大西屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0967",
    },
    {
      label: "博多屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0968",
    },
    {
      label: "茶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0969",
    },
    {
      label: "虎屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0970",
    },
    {
      label: "川舟屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0971",
    },
    {
      label: "神屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0972",
    },
    {
      label: "友野屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0973",
    },
    {
      label: "簗田屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0974",
    },
    {
      label: "坂田屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0975",
    },
    {
      label: "天王寺屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0976",
    },
    {
      label: "鴻池屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0977",
    },
    {
      label: "末吉屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0978",
    },
    {
      label: "播磨屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0979",
    },
    {
      label: "角屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0980",
    },
    {
      label: "山形屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0981",
    },
    {
      label: "平野屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0982",
    },
    {
      label: "淀屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0983",
    },
    {
      label: "角倉屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0984",
    },
    {
      label: "乾物屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0985",
    },
    {
      label: "花屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0986",
    },
    {
      label: "肉屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0987",
    },
    {
      label: "魚屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0988",
    },
    {
      label: "本屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0989",
    },
    {
      label: "油屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0990",
    },
    {
      label: "酒屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0991",
    },
    {
      label: "床屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0992",
    },
    {
      label: "飯屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0993",
    },
    {
      label: "雑貨屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0994",
    },
    {
      label: "呉服屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0995",
    },
    {
      label: "金物屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0996",
    },
    {
      label: "石屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0997",
    },
    {
      label: "八百屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0998",
    },
    {
      label: "豆腐屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0999",
    },
    {
      label: "風呂屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1000",
    },
    {
      label: "黒脛巾衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1001",
    },
    {
      label: "戸隠衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1002",
    },
    {
      label: "風魔衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1003",
    },
    {
      label: "軒猿衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1004",
    },
    {
      label: "透波衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1005",
    },
    {
      label: "甲賀衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1006",
    },
    {
      label: "伊賀衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1007",
    },
    {
      label: "根来衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1008",
    },
    {
      label: "鉢屋衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1009",
    },
    {
      label: "外聞衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1010",
    },
    {
      label: "山くぐり衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1011",
    },
    {
      label: "羽黒衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1012",
    },
    {
      label: "安東水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1013",
    },
    {
      label: "房総水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1014",
    },
    {
      label: "相模水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1015",
    },
    {
      label: "駿河水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1016",
    },
    {
      label: "熊野水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1017",
    },
    {
      label: "丹後水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1018",
    },
    {
      label: "淡路水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1019",
    },
    {
      label: "塩飽水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1020",
    },
    {
      label: "村上水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1021",
    },
    {
      label: "土佐水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1022",
    },
    {
      label: "豊後水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1023",
    },
    {
      label: "五島水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1024",
    },
    {
      label: "坊津水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1025",
    },
    {
      label: "江戸水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1026",
    },
    {
      label: "大名家Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1027",
    },
    {
      label: "大名家Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1028",
    },
    {
      label: "大名家Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1029",
    },
    {
      label: "大名家Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1030",
    },
    {
      label: "大名家Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1031",
    },
    {
      label: "主人公大名家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1032",
    },
    {
      label: "商家Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1033",
    },
    {
      label: "商家Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1034",
    },
    {
      label: "商家Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1035",
    },
    {
      label: "商家Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1036",
    },
    {
      label: "商家Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1037",
    },
    {
      label: "主人公商家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1038",
    },
    {
      label: "忍者衆Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1039",
    },
    {
      label: "忍者衆Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1040",
    },
    {
      label: "忍者衆Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1041",
    },
    {
      label: "忍者衆Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1042",
    },
    {
      label: "忍者衆Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1043",
    },
    {
      label: "主人公忍者衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1044",
    },
    {
      label: "海賊衆Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1045",
    },
    {
      label: "海賊衆Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1046",
    },
    {
      label: "海賊衆Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1047",
    },
    {
      label: "海賊衆Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1048",
    },
    {
      label: "海賊衆Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1049",
    },
    {
      label: "主人公海賊衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1050",
    },
    {
      label: "勢力Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1051",
    },
    {
      label: "勢力Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1052",
    },
    {
      label: "勢力Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1053",
    },
    {
      label: "勢力Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1054",
    },
    {
      label: "勢力Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1055",
    },
    {
      label: "主人公勢力",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1056",
    },
    {
      label: "発生勢力",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1057",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1058",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("勢力::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionLordsData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "青山忠成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "赤池長任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "赤井直正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "安西又助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "赤尾清綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "明石全登",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "赤穴盛清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "赤松政秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "赤松義祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "秋上久家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "安芸国虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "秋田実季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "秋山虎繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "明智秀満",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "明智光秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "浅井井頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "浅井長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "浅井久政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "朝倉景鏡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "朝倉景健",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "朝倉景恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "朝倉景連",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "朝倉宗滴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "朝倉義景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "浅野長晟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "浅野長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "浅野幸長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "朝比奈泰朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "浅利勝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "足利義昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "足利義氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "足利義輝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "蘆名盛氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "蘆名盛興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "蘆名盛重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "蘆名盛隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "阿蘇惟将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "安宅信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "安宅冬康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "跡部勝資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "穴山小助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "穴山梅雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "姉小路頼綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "阿部正次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "尼子勝久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "尼子晴久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "尼子義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "天野隆重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "天野康景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "雨森弥兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "鮎貝宗重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "荒木氏綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "荒木村重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "有馬晴信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "安国寺恵瓊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "安東高季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "安東愛季",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "安藤直次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "安藤守就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "安藤良整",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "飯尾連龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "飯田覚兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "井伊直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "伊賀崎道順",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "伊木忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "池田惣左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "池田恒興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "池田輝政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "池田元助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "池頼和",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "生駒親正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "石川昭光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "石川数正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "石川五右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "石川高信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "石田三成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "石母田景頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "伊集院忠倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "伊集院忠棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "以心崇伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "磯野員昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "板倉勝重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "板部岡江雪斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "伊丹康直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "市川経好",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "一栗放牛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "一条兼定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "一条信龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "伊地知重興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "伊地知重秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "一万田鑑実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "一色義清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "一色義定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "一色義道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "出浦盛清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "伊藤一刀斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "伊東祐兵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "伊藤惣十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "伊東義祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "伊奈忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "稲富一夢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "稲葉一鉄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "稲葉貞通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "稲葉正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "猪苗代盛国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "猪子兵介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "猪俣邦憲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "今井宗久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "今井宗薫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "今川氏真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "今川義元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "宇野藤右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "色部勝長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "色部長実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "岩成友通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "犬童頼安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "上杉景勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "上杉景虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "上杉景信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "上杉謙信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "神屋宗湛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "坂田源右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "鵜飼孫六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "宇喜多忠家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "宇喜多直家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "宇喜多秀家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "宇久純定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "宇久純玄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "宇佐美定満",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "氏家卜全",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "氏家光氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "氏家守棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "氏家行広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "牛尾幸清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "臼杵鑑速",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "宇都宮国綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "宇都宮広綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "鵜殿氏長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "鵜殿長照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "宇山久兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "浦上宗景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "上井覚兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "海野六郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "頴娃久虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "江村親家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "江里口信常",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "円城寺信胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "遠藤直経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "遠藤基信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "大石智久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "大内定綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "大内輝弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "大内義長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "大久保忠佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "大久保忠教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "大久保忠隣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "大久保忠世",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "大久保長安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "大熊朝秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "大崎義隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "大崎義直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "大須賀康高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "太田氏資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "太田牛一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "太田三楽斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "大谷吉継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "大月景秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "大友宗麟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "大友親家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "大友親盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "大友義統",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "大野治長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "大村純忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "小笠原長時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "小笠原少斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "岡家利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "岡部貞綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "岡部正綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "岡部元信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "岡本随縁斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "岡本禅哲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "岡本頼氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "岡吉正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "奥平信昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "奥村永福",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "長船貞親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "長船綱直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "小瀬甫庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
    {
      label: "小田氏治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0188",
    },
    {
      label: "織田有楽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0189",
    },
    {
      label: "織田信勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0190",
    },
    {
      label: "織田信雄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0191",
    },
    {
      label: "織田信包",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0192",
    },
    {
      label: "織田信孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0193",
    },
    {
      label: "織田信忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0194",
    },
    {
      label: "織田信長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0195",
    },
    {
      label: "織田秀信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0196",
    },
    {
      label: "小寺政職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0197",
    },
    {
      label: "小島弥太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0198",
    },
    {
      label: "鬼庭左月",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0199",
    },
    {
      label: "鬼庭綱元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0200",
    },
    {
      label: "小野鎮幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0201",
    },
    {
      label: "小野善鬼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0202",
    },
    {
      label: "小野忠明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0203",
    },
    {
      label: "小野寺輝道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0204",
    },
    {
      label: "小野寺義道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0205",
    },
    {
      label: "小幡勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0206",
    },
    {
      label: "小浜景隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0207",
    },
    {
      label: "飯富虎昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0208",
    },
    {
      label: "小山田信茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0209",
    },
    {
      label: "甲斐宗運",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0210",
    },
    {
      label: "海北綱親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0211",
    },
    {
      label: "香川親和",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0212",
    },
    {
      label: "香川元景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0213",
    },
    {
      label: "柿崎景家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0214",
    },
    {
      label: "蠣崎季広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0215",
    },
    {
      label: "蠣崎慶広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0216",
    },
    {
      label: "垣屋光成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0217",
    },
    {
      label: "筧十蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0218",
    },
    {
      label: "葛西晴信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0219",
    },
    {
      label: "笠原政堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0220",
    },
    {
      label: "梶原景宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0221",
    },
    {
      label: "果心居士",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0222",
    },
    {
      label: "糟谷武則",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0223",
    },
    {
      label: "片桐且元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0224",
    },
    {
      label: "片倉景綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0225",
    },
    {
      label: "佐甲藤太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0226",
    },
    {
      label: "堅田元慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0227",
    },
    {
      label: "桂元澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0228",
    },
    {
      label: "葛山氏元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0229",
    },
    {
      label: "加藤清正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0230",
    },
    {
      label: "加藤段蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0231",
    },
    {
      label: "加藤光泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0232",
    },
    {
      label: "加藤嘉明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0233",
    },
    {
      label: "金上盛備",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0234",
    },
    {
      label: "金森長近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0235",
    },
    {
      label: "可児才蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0236",
    },
    {
      label: "鐘捲自斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0237",
    },
    {
      label: "蒲池鑑盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0238",
    },
    {
      label: "亀井茲矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0239",
    },
    {
      label: "蒲生氏郷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0240",
    },
    {
      label: "蒲生賢秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0241",
    },
    {
      label: "蒲生定秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0242",
    },
    {
      label: "蒲生頼郷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0243",
    },
    {
      label: "蒲生秀行",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0244",
    },
    {
      label: "川上忠智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0245",
    },
    {
      label: "川上久朗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0246",
    },
    {
      label: "河尻秀隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0247",
    },
    {
      label: "河田長親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0248",
    },
    {
      label: "願証寺証恵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0249",
    },
    {
      label: "神戸具盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0250",
    },
    {
      label: "菅達長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0251",
    },
    {
      label: "城井鎮房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0252",
    },
    {
      label: "喜入季久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0253",
    },
    {
      label: "木曽義昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0254",
    },
    {
      label: "木曽義康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0255",
    },
    {
      label: "北条景広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0256",
    },
    {
      label: "北条高広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0257",
    },
    {
      label: "北信愛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0258",
    },
    {
      label: "北畠具教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0259",
    },
    {
      label: "北畠具房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0260",
    },
    {
      label: "北畠晴具",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0261",
    },
    {
      label: "吉川経家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0262",
    },
    {
      label: "吉川広家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0263",
    },
    {
      label: "吉川元長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0264",
    },
    {
      label: "吉川元春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0265",
    },
    {
      label: "木下昌直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0266",
    },
    {
      label: "木村重成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0267",
    },
    {
      label: "肝付兼続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0268",
    },
    {
      label: "肝付兼護",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0269",
    },
    {
      label: "肝付良兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0270",
    },
    {
      label: "京極高次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0271",
    },
    {
      label: "京極高知",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0272",
    },
    {
      label: "京極高吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0273",
    },
    {
      label: "吉良親貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0274",
    },
    {
      label: "吉良親実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0275",
    },
    {
      label: "霧隠才蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0276",
    },
    {
      label: "九鬼広隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0277",
    },
    {
      label: "九鬼守隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0278",
    },
    {
      label: "九鬼嘉隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0279",
    },
    {
      label: "楠長諳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0280",
    },
    {
      label: "口羽通良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0281",
    },
    {
      label: "朽木元綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0282",
    },
    {
      label: "国司元相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0283",
    },
    {
      label: "国友善兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0284",
    },
    {
      label: "九戸政実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0285",
    },
    {
      label: "熊谷信直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0286",
    },
    {
      label: "組屋源四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0287",
    },
    {
      label: "末吉孫左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0288",
    },
    {
      label: "蔵田五郎左",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0289",
    },
    {
      label: "来島通総",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0290",
    },
    {
      label: "村上通康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0291",
    },
    {
      label: "黒田如水",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0292",
    },
    {
      label: "黒田長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0293",
    },
    {
      label: "黒田職隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0294",
    },
    {
      label: "桑名吉成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0295",
    },
    {
      label: "上泉信綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0296",
    },
    {
      label: "高坂甚内",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0297",
    },
    {
      label: "高坂昌信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0298",
    },
    {
      label: "香宗我部親泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0299",
    },
    {
      label: "河野牛福丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0300",
    },
    {
      label: "河野通宣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0301",
    },
    {
      label: "高力清長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0302",
    },
    {
      label: "小島職鎮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0303",
    },
    {
      label: "五代友喜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0304",
    },
    {
      label: "児玉就英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0305",
    },
    {
      label: "木造具政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0306",
    },
    {
      label: "籠手田安一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0307",
    },
    {
      label: "籠手田安経",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0308",
    },
    {
      label: "後藤賢豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0309",
    },
    {
      label: "後藤信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0310",
    },
    {
      label: "後藤又兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0311",
    },
    {
      label: "小西行長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0312",
    },
    {
      label: "小西隆佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0313",
    },
    {
      label: "小早川隆景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0314",
    },
    {
      label: "小早川秀秋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0315",
    },
    {
      label: "小早川秀包",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0316",
    },
    {
      label: "小堀遠州",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0317",
    },
    {
      label: "小梁川盛宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0318",
    },
    {
      label: "近藤義武",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0319",
    },
    {
      label: "西園寺公広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0320",
    },
    {
      label: "雑賀孫一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0321",
    },
    {
      label: "斎藤龍興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0322",
    },
    {
      label: "斎藤伝鬼坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0323",
    },
    {
      label: "斎藤道三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0324",
    },
    {
      label: "斎藤利三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0325",
    },
    {
      label: "斎藤朝信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0326",
    },
    {
      label: "斎藤義龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0327",
    },
    {
      label: "斎村政広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0328",
    },
    {
      label: "佐伯惟定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0329",
    },
    {
      label: "吉田印西",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0330",
    },
    {
      label: "酒井家次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0331",
    },
    {
      label: "酒井忠次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0332",
    },
    {
      label: "酒井忠世",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0333",
    },
    {
      label: "坂井政尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0334",
    },
    {
      label: "榊原康政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0335",
    },
    {
      label: "坂崎直盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0336",
    },
    {
      label: "相良義陽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0337",
    },
    {
      label: "相良頼房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0338",
    },
    {
      label: "佐久間信盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0339",
    },
    {
      label: "佐久間盛重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0340",
    },
    {
      label: "佐久間盛政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0341",
    },
    {
      label: "鮭延秀綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0342",
    },
    {
      label: "佐々木小次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0343",
    },
    {
      label: "笹部勘二郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0344",
    },
    {
      label: "佐世元嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0345",
    },
    {
      label: "佐竹義昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0346",
    },
    {
      label: "佐竹義重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0347",
    },
    {
      label: "佐竹義宣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0348",
    },
    {
      label: "佐竹義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0349",
    },
    {
      label: "佐田彦四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0350",
    },
    {
      label: "佐々成政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0351",
    },
    {
      label: "里見義堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0352",
    },
    {
      label: "里見義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0353",
    },
    {
      label: "里見義康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0354",
    },
    {
      label: "里見義頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0355",
    },
    {
      label: "真田信綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0356",
    },
    {
      label: "真田信幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0357",
    },
    {
      label: "真田昌輝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0358",
    },
    {
      label: "真田昌幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0359",
    },
    {
      label: "真田幸隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0360",
    },
    {
      label: "真田幸村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0361",
    },
    {
      label: "佐野房綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0362",
    },
    {
      label: "佐分利猪之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0363",
    },
    {
      label: "猿飛佐助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0364",
    },
    {
      label: "猿渡信光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0365",
    },
    {
      label: "山本寺定長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0366",
    },
    {
      label: "椎名康胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0367",
    },
    {
      label: "志賀親次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0368",
    },
    {
      label: "志賀親守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0369",
    },
    {
      label: "繁沢元氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0370",
    },
    {
      label: "宍戸隆家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0371",
    },
    {
      label: "宍戸梅軒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0372",
    },
    {
      label: "宍戸元続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0373",
    },
    {
      label: "七条兼仲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0374",
    },
    {
      label: "七里頼周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0375",
    },
    {
      label: "篠原長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0376",
    },
    {
      label: "斯波詮直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0377",
    },
    {
      label: "斯波詮真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0378",
    },
    {
      label: "柴田勝家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0379",
    },
    {
      label: "柴田勝豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0380",
    },
    {
      label: "新発田重家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0381",
    },
    {
      label: "新発田長敦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0382",
    },
    {
      label: "芝辻清右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0383",
    },
    {
      label: "渋谷与右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0384",
    },
    {
      label: "島井宗室",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0385",
    },
    {
      label: "島左近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0386",
    },
    {
      label: "島津家久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0387",
    },
    {
      label: "島津日新斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0388",
    },
    {
      label: "島津貴久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0389",
    },
    {
      label: "島津忠恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0390",
    },
    {
      label: "島津歳久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0391",
    },
    {
      label: "島津豊久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0392",
    },
    {
      label: "島津義虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0393",
    },
    {
      label: "島津義久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0394",
    },
    {
      label: "島津義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0395",
    },
    {
      label: "清水宗治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0396",
    },
    {
      label: "清水康英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0397",
    },
    {
      label: "志村光安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0398",
    },
    {
      label: "下間仲孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0399",
    },
    {
      label: "下間頼照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0400",
    },
    {
      label: "下間頼廉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0401",
    },
    {
      label: "上条政繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0402",
    },
    {
      label: "白石宗実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0403",
    },
    {
      label: "神西元通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0404",
    },
    {
      label: "神保氏張",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0405",
    },
    {
      label: "神保長住",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0406",
    },
    {
      label: "神保長城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0407",
    },
    {
      label: "神保長職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0408",
    },
    {
      label: "陶晴賢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0409",
    },
    {
      label: "菅沼定盈",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0410",
    },
    {
      label: "杉谷善住坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0411",
    },
    {
      label: "杉之坊照算",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0412",
    },
    {
      label: "鈴木佐太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0413",
    },
    {
      label: "鈴木重朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0414",
    },
    {
      label: "薄田兼相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0415",
    },
    {
      label: "鈴木元信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0416",
    },
    {
      label: "須田満親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0417",
    },
    {
      label: "津田宗及",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0418",
    },
    {
      label: "角倉素庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0419",
    },
    {
      label: "角倉了以",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0420",
    },
    {
      label: "関一政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0421",
    },
    {
      label: "関口氏広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0422",
    },
    {
      label: "世鬼政時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0423",
    },
    {
      label: "関盛信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0424",
    },
    {
      label: "仙石秀久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0425",
    },
    {
      label: "千利休",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0426",
    },
    {
      label: "相馬盛胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0427",
    },
    {
      label: "相馬義胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0428",
    },
    {
      label: "宗義調",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0429",
    },
    {
      label: "宗義智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0430",
    },
    {
      label: "十河一存",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0431",
    },
    {
      label: "十河存保",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0432",
    },
    {
      label: "太原雪斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0433",
    },
    {
      label: "大道寺政繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0434",
    },
    {
      label: "大宝寺義氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0435",
    },
    {
      label: "高島正重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0436",
    },
    {
      label: "高梨政頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0437",
    },
    {
      label: "高橋鑑種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0438",
    },
    {
      label: "高橋紹運",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0439",
    },
    {
      label: "高山重友",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0440",
    },
    {
      label: "高山友照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0441",
    },
    {
      label: "滝川一益",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0442",
    },
    {
      label: "滝川雄利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0443",
    },
    {
      label: "田北鎮周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0444",
    },
    {
      label: "滝本寺非有",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0445",
    },
    {
      label: "武井夕庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0446",
    },
    {
      label: "武田勝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0447",
    },
    {
      label: "武田逍遙軒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0448",
    },
    {
      label: "武田信玄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0449",
    },
    {
      label: "武田信繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0450",
    },
    {
      label: "武田信豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0451",
    },
    {
      label: "武田元明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0452",
    },
    {
      label: "武田義信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0453",
    },
    {
      label: "竹中重門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0454",
    },
    {
      label: "竹中半兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0455",
    },
    {
      label: "立花道雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0456",
    },
    {
      label: "立花直次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0457",
    },
    {
      label: "立花宗茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0458",
    },
    {
      label: "立原久綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0459",
    },
    {
      label: "楯岡満茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0460",
    },
    {
      label: "伊達実元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0461",
    },
    {
      label: "伊達成実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0462",
    },
    {
      label: "伊達稙宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0463",
    },
    {
      label: "伊達輝宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0464",
    },
    {
      label: "伊達晴宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0465",
    },
    {
      label: "伊達政宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0466",
    },
    {
      label: "田中勝助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0467",
    },
    {
      label: "田中吉政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0468",
    },
    {
      label: "谷忠澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0469",
    },
    {
      label: "種子島時堯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0470",
    },
    {
      label: "種子島久時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0471",
    },
    {
      label: "田村清顕",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0472",
    },
    {
      label: "多羅尾光俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0473",
    },
    {
      label: "田原親賢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0474",
    },
    {
      label: "千賀孫兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0475",
    },
    {
      label: "千坂景親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0476",
    },
    {
      label: "千葉邦胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0477",
    },
    {
      label: "千葉胤富",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0478",
    },
    {
      label: "茶屋又四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0479",
    },
    {
      label: "茶屋四郎次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0480",
    },
    {
      label: "長宗我部国親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0481",
    },
    {
      label: "長宗我部信親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0482",
    },
    {
      label: "長宗我部元親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0483",
    },
    {
      label: "長宗我部盛親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0484",
    },
    {
      label: "長続連",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0485",
    },
    {
      label: "長連龍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0486",
    },
    {
      label: "塚原卜伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0487",
    },
    {
      label: "津軽為信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0488",
    },
    {
      label: "柘植三之丞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0489",
    },
    {
      label: "津田信澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0490",
    },
    {
      label: "土屋昌恒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0491",
    },
    {
      label: "筒井定次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0492",
    },
    {
      label: "筒井順慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0493",
    },
    {
      label: "角隈石宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0494",
    },
    {
      label: "津野親忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0495",
    },
    {
      label: "土居宗珊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0496",
    },
    {
      label: "土井利勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0497",
    },
    {
      label: "東郷重位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0498",
    },
    {
      label: "藤堂高虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0499",
    },
    {
      label: "遠山景任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0500",
    },
    {
      label: "遠山綱景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0501",
    },
    {
      label: "戸川秀安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0502",
    },
    {
      label: "戸川逵安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0503",
    },
    {
      label: "土岐頼次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0504",
    },
    {
      label: "得居通之",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0505",
    },
    {
      label: "徳川家康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0506",
    },
    {
      label: "徳川信康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0507",
    },
    {
      label: "徳川秀忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0508",
    },
    {
      label: "戸沢盛安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0509",
    },
    {
      label: "富田景政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0510",
    },
    {
      label: "富田重政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0511",
    },
    {
      label: "富田勢源",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0512",
    },
    {
      label: "富田隆実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0513",
    },
    {
      label: "富永山随",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0514",
    },
    {
      label: "豊臣秀次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0515",
    },
    {
      label: "豊臣秀長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0516",
    },
    {
      label: "豊臣秀吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0517",
    },
    {
      label: "豊臣秀頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0518",
    },
    {
      label: "鳥居強右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0519",
    },
    {
      label: "鳥居忠吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0520",
    },
    {
      label: "鳥居元忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0521",
    },
    {
      label: "内藤如安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0522",
    },
    {
      label: "内藤昌豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0523",
    },
    {
      label: "内藤正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0524",
    },
    {
      label: "直江景綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0525",
    },
    {
      label: "直江兼続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0526",
    },
    {
      label: "長井道利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0527",
    },
    {
      label: "長尾政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0528",
    },
    {
      label: "中川清秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0529",
    },
    {
      label: "長坂釣閑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0530",
    },
    {
      label: "中島重房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0531",
    },
    {
      label: "中島可之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0532",
    },
    {
      label: "中条景泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0533",
    },
    {
      label: "永田徳本",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0534",
    },
    {
      label: "長野具藤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0535",
    },
    {
      label: "長野業正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0536",
    },
    {
      label: "長野業盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0537",
    },
    {
      label: "中野宗時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0538",
    },
    {
      label: "中村一氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0539",
    },
    {
      label: "道川兵衛三郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0540",
    },
    {
      label: "中山朝正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0541",
    },
    {
      label: "名古屋山三郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0542",
    },
    {
      label: "奈佐日本助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0543",
    },
    {
      label: "那須資晴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0544",
    },
    {
      label: "長束正家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0545",
    },
    {
      label: "夏目吉信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0546",
    },
    {
      label: "鍋島勝茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0547",
    },
    {
      label: "鍋島直茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0548",
    },
    {
      label: "呂宋助左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0549",
    },
    {
      label: "成田氏長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0550",
    },
    {
      label: "成田長忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0551",
    },
    {
      label: "成田長泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0552",
    },
    {
      label: "成松信勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0553",
    },
    {
      label: "成富茂安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0554",
    },
    {
      label: "南部利直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0555",
    },
    {
      label: "南部信直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0556",
    },
    {
      label: "南部晴政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0557",
    },
    {
      label: "新納忠元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0558",
    },
    {
      label: "西川仁右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0559",
    },
    {
      label: "仁科盛信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0560",
    },
    {
      label: "二曲輪猪助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0561",
    },
    {
      label: "二宮就辰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0562",
    },
    {
      label: "二本松義継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0563",
    },
    {
      label: "丹羽長重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0564",
    },
    {
      label: "丹羽長秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0565",
    },
    {
      label: "温井景隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0566",
    },
    {
      label: "沼田祐光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0567",
    },
    {
      label: "根岸兎角",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0568",
    },
    {
      label: "禰寝重長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0569",
    },
    {
      label: "根津甚八",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0570",
    },
    {
      label: "乃美宗勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0571",
    },
    {
      label: "拝郷家嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0572",
    },
    {
      label: "垪和氏続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0573",
    },
    {
      label: "芳賀高定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0574",
    },
    {
      label: "芳賀高継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0575",
    },
    {
      label: "友野二郎兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0576",
    },
    {
      label: "支倉常長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0577",
    },
    {
      label: "畠山高政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0578",
    },
    {
      label: "畠山義続",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0579",
    },
    {
      label: "畠山義綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0580",
    },
    {
      label: "波多野晴通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0581",
    },
    {
      label: "波多野秀尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0582",
    },
    {
      label: "波多野秀治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0583",
    },
    {
      label: "蜂須賀家政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0584",
    },
    {
      label: "蜂須賀小六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0585",
    },
    {
      label: "蜂屋頼隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0586",
    },
    {
      label: "服部半蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0587",
    },
    {
      label: "堀立直正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0588",
    },
    {
      label: "花房正成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0589",
    },
    {
      label: "花房正幸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0590",
    },
    {
      label: "花房職秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0591",
    },
    {
      label: "馬場信春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0592",
    },
    {
      label: "林崎甚助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0593",
    },
    {
      label: "林秀貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0594",
    },
    {
      label: "原田宗時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0595",
    },
    {
      label: "原虎胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0596",
    },
    {
      label: "原昌胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0597",
    },
    {
      label: "播磨屋宗徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0598",
    },
    {
      label: "塙直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0599",
    },
    {
      label: "塙団右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0600",
    },
    {
      label: "疋田豊五郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0601",
    },
    {
      label: "久武親直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0602",
    },
    {
      label: "久武親信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0603",
    },
    {
      label: "鴻池新六",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0604",
    },
    {
      label: "日根野弘就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0605",
    },
    {
      label: "百武賢兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0606",
    },
    {
      label: "平井経治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0607",
    },
    {
      label: "平岩親吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0608",
    },
    {
      label: "平岡房実",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0609",
    },
    {
      label: "平賀元相",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0610",
    },
    {
      label: "平手汎秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0611",
    },
    {
      label: "平野長泰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0612",
    },
    {
      label: "風魔小太郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0613",
    },
    {
      label: "深水長智",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0614",
    },
    {
      label: "福島正則",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0615",
    },
    {
      label: "福留親政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0616",
    },
    {
      label: "福留儀重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0617",
    },
    {
      label: "福原貞俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0618",
    },
    {
      label: "古田織部",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0619",
    },
    {
      label: "不破光治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0620",
    },
    {
      label: "別所長治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0621",
    },
    {
      label: "穂井田元清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0622",
    },
    {
      label: "北条氏勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0623",
    },
    {
      label: "北条氏邦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0624",
    },
    {
      label: "北条氏繁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0625",
    },
    {
      label: "北条氏照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0626",
    },
    {
      label: "北条氏直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0627",
    },
    {
      label: "北条氏規",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0628",
    },
    {
      label: "北条氏政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0629",
    },
    {
      label: "北条氏康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0630",
    },
    {
      label: "北条幻庵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0631",
    },
    {
      label: "北条綱成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0632",
    },
    {
      label: "宝蔵院胤栄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0633",
    },
    {
      label: "保科正俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0634",
    },
    {
      label: "安井道頓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0635",
    },
    {
      label: "細川忠興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0636",
    },
    {
      label: "細川晴元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0637",
    },
    {
      label: "細川幽斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0638",
    },
    {
      label: "堀尾忠氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0639",
    },
    {
      label: "堀尾吉晴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0640",
    },
    {
      label: "堀直政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0641",
    },
    {
      label: "堀内氏善",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0642",
    },
    {
      label: "堀秀治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0643",
    },
    {
      label: "堀秀政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0644",
    },
    {
      label: "本因坊算砂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0645",
    },
    {
      label: "本願寺教如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0646",
    },
    {
      label: "本願寺顕如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0647",
    },
    {
      label: "本願寺准如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0648",
    },
    {
      label: "北郷時久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0649",
    },
    {
      label: "本庄繁長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0650",
    },
    {
      label: "本多重次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0651",
    },
    {
      label: "本多忠勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0652",
    },
    {
      label: "本多忠朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0653",
    },
    {
      label: "本多忠政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0654",
    },
    {
      label: "本多正純",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0655",
    },
    {
      label: "本多正信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0656",
    },
    {
      label: "前田慶次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0657",
    },
    {
      label: "前田玄以",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0658",
    },
    {
      label: "前田利家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0659",
    },
    {
      label: "前田利長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0660",
    },
    {
      label: "前田利政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0661",
    },
    {
      label: "前野長康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0662",
    },
    {
      label: "前波吉継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0663",
    },
    {
      label: "真壁氏幹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0664",
    },
    {
      label: "真柄直澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0665",
    },
    {
      label: "真柄直隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0666",
    },
    {
      label: "正木時茂",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0667",
    },
    {
      label: "正木時忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0668",
    },
    {
      label: "正木頼忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0669",
    },
    {
      label: "増田長盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0670",
    },
    {
      label: "益田元祥",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0671",
    },
    {
      label: "松井康之",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0672",
    },
    {
      label: "松井友閑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0673",
    },
    {
      label: "松倉重信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0674",
    },
    {
      label: "松倉重政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0675",
    },
    {
      label: "松下加兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0676",
    },
    {
      label: "松平忠吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0677",
    },
    {
      label: "松田憲秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0678",
    },
    {
      label: "松永久秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0679",
    },
    {
      label: "松永久通",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0680",
    },
    {
      label: "松波義親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0681",
    },
    {
      label: "角屋七郎次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0682",
    },
    {
      label: "松浦鎮信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0683",
    },
    {
      label: "松浦隆信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0684",
    },
    {
      label: "曲直瀬道三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0685",
    },
    {
      label: "丸目長恵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0686",
    },
    {
      label: "三雲成持",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0687",
    },
    {
      label: "御宿勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0688",
    },
    {
      label: "水谷胤重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0689",
    },
    {
      label: "水野勝成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0690",
    },
    {
      label: "水野忠重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0691",
    },
    {
      label: "水野信元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0692",
    },
    {
      label: "溝尾庄兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0693",
    },
    {
      label: "溝口秀勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0694",
    },
    {
      label: "三刀屋久祐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0695",
    },
    {
      label: "三村家親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0696",
    },
    {
      label: "三村元親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0697",
    },
    {
      label: "宮部継潤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0698",
    },
    {
      label: "宮本伝太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0699",
    },
    {
      label: "宮本武蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0700",
    },
    {
      label: "三好笑巌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0701",
    },
    {
      label: "三好長治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0702",
    },
    {
      label: "三好長逸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0703",
    },
    {
      label: "三好長慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0704",
    },
    {
      label: "三好為三",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0705",
    },
    {
      label: "三好宗渭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0706",
    },
    {
      label: "三好義興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0707",
    },
    {
      label: "三好実休",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0708",
    },
    {
      label: "三好義継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0709",
    },
    {
      label: "向井正綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0710",
    },
    {
      label: "村井貞勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0711",
    },
    {
      label: "村井長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0712",
    },
    {
      label: "村上国清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0713",
    },
    {
      label: "村上武吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0714",
    },
    {
      label: "村上元吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0715",
    },
    {
      label: "村上義清",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0716",
    },
    {
      label: "毛受勝照",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0717",
    },
    {
      label: "毛利勝永",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0718",
    },
    {
      label: "毛利重能",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0719",
    },
    {
      label: "毛利隆元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0720",
    },
    {
      label: "毛利輝元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0721",
    },
    {
      label: "毛利元就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0722",
    },
    {
      label: "最上義光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0723",
    },
    {
      label: "最上義時",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0724",
    },
    {
      label: "最上義守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0725",
    },
    {
      label: "望月六郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0726",
    },
    {
      label: "本山茂宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0727",
    },
    {
      label: "籾井教業",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0728",
    },
    {
      label: "百地三太夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0729",
    },
    {
      label: "森下道誉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0730",
    },
    {
      label: "森忠政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0731",
    },
    {
      label: "母里太兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0732",
    },
    {
      label: "森長可",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0733",
    },
    {
      label: "森村春",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0734",
    },
    {
      label: "森可成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0735",
    },
    {
      label: "森蘭丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0736",
    },
    {
      label: "師岡一羽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0737",
    },
    {
      label: "問註所統景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0738",
    },
    {
      label: "八板金兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0739",
    },
    {
      label: "柳生石舟斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0740",
    },
    {
      label: "柳生兵庫助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0741",
    },
    {
      label: "柳生宗矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0742",
    },
    {
      label: "施薬院全宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0743",
    },
    {
      label: "矢沢頼綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0744",
    },
    {
      label: "矢沢頼康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0745",
    },
    {
      label: "屋代景頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0746",
    },
    {
      label: "安田顕元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0747",
    },
    {
      label: "安田長秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0748",
    },
    {
      label: "柳原戸兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0749",
    },
    {
      label: "山県昌景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0750",
    },
    {
      label: "山崎片家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0751",
    },
    {
      label: "山崎長徳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0752",
    },
    {
      label: "山田有信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0753",
    },
    {
      label: "山田長政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0754",
    },
    {
      label: "山田宗昌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0755",
    },
    {
      label: "山中鹿介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0756",
    },
    {
      label: "山中俊好",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0757",
    },
    {
      label: "山名祐豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0758",
    },
    {
      label: "山名禅高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0759",
    },
    {
      label: "山内一豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0760",
    },
    {
      label: "山本勘助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0761",
    },
    {
      label: "湯浅五助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0762",
    },
    {
      label: "結城晴朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0763",
    },
    {
      label: "結城秀康",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0764",
    },
    {
      label: "結城政勝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0765",
    },
    {
      label: "遊佐続光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0766",
    },
    {
      label: "由利鎌之助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0767",
    },
    {
      label: "横谷左近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0768",
    },
    {
      label: "吉江景資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0769",
    },
    {
      label: "吉岡憲法",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0770",
    },
    {
      label: "吉岡清十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0771",
    },
    {
      label: "吉岡伝七郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0772",
    },
    {
      label: "吉岡長増",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0773",
    },
    {
      label: "吉田重俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0774",
    },
    {
      label: "吉田孝頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0775",
    },
    {
      label: "吉田政重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0776",
    },
    {
      label: "吉田康俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0777",
    },
    {
      label: "吉弘鑑理",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0778",
    },
    {
      label: "吉見正頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0779",
    },
    {
      label: "世瀬蔵人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0780",
    },
    {
      label: "淀屋常安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0781",
    },
    {
      label: "簗田藤左衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0782",
    },
    {
      label: "依岡左京",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0783",
    },
    {
      label: "龍造寺家就",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0784",
    },
    {
      label: "龍造寺隆信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0785",
    },
    {
      label: "龍造寺長信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0786",
    },
    {
      label: "龍造寺信周",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0787",
    },
    {
      label: "龍造寺政家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0788",
    },
    {
      label: "留守政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0789",
    },
    {
      label: "六角承禎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0790",
    },
    {
      label: "六角義治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0791",
    },
    {
      label: "若林鎮興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0792",
    },
    {
      label: "脇坂安治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0793",
    },
    {
      label: "分部光嘉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0794",
    },
    {
      label: "和田昭為",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0795",
    },
    {
      label: "和田惟政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0796",
    },
    {
      label: "渡辺勘兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0797",
    },
    {
      label: "渡辺守綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0798",
    },
    {
      label: "亘理元宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0799",
    },
    {
      label: "上杉憲政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0800",
    },
    {
      label: "武田信虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0801",
    },
    {
      label: "大内義隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0802",
    },
    {
      label: "織田信秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0803",
    },
    {
      label: "松平広忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0804",
    },
    {
      label: "平手政秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0805",
    },
    {
      label: "九鬼浄隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0806",
    },
    {
      label: "畠山秋高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0807",
    },
    {
      label: "赤松晴政",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0808",
    },
    {
      label: "少弐冬尚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0809",
    },
    {
      label: "有馬義貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0810",
    },
    {
      label: "大友義鑑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0811",
    },
    {
      label: "本願寺証如",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0812",
    },
    {
      label: "大宝寺義増",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0813",
    },
    {
      label: "斯波義統",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0814",
    },
    {
      label: "織田信友",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0815",
    },
    {
      label: "細川氏綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0816",
    },
    {
      label: "六角定頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0817",
    },
    {
      label: "島津勝久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0818",
    },
    {
      label: "筒井順昭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0819",
    },
    {
      label: "二階堂盛義",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0820",
    },
    {
      label: "一宮随波斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0821",
    },
    {
      label: "有馬晴純",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0822",
    },
    {
      label: "相良晴広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0823",
    },
    {
      label: "村上吉充",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0824",
    },
    {
      label: "岩間小熊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0825",
    },
    {
      label: "梶原政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0826",
    },
    {
      label: "松永長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0827",
    },
    {
      label: "毛利秀元",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0828",
    },
    {
      label: "大谷休泊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0829",
    },
    {
      label: "遊佐信教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0830",
    },
    {
      label: "田北紹鉄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0831",
    },
    {
      label: "冷泉隆豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0832",
    },
    {
      label: "相良武任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0833",
    },
    {
      label: "飯田興秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0834",
    },
    {
      label: "児玉就方",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0835",
    },
    {
      label: "白井賢胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0836",
    },
    {
      label: "織田信光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0837",
    },
    {
      label: "小山田信有",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0838",
    },
    {
      label: "尼子国久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0839",
    },
    {
      label: "尼子誠久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0840",
    },
    {
      label: "坂井大膳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0841",
    },
    {
      label: "別所就治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0842",
    },
    {
      label: "志道広良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0843",
    },
    {
      label: "鍋島清房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0844",
    },
    {
      label: "神屋紹策",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0845",
    },
    {
      label: "内藤興盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0846",
    },
    {
      label: "島津実久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0847",
    },
    {
      label: "井上元兼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0848",
    },
    {
      label: "津田宗達",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0849",
    },
    {
      label: "阿蘇惟豊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0850",
    },
    {
      label: "津田算長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0851",
    },
    {
      label: "杉重矩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0852",
    },
    {
      label: "城井長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0853",
    },
    {
      label: "葛西晴胤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0854",
    },
    {
      label: "江上武種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0855",
    },
    {
      label: "佐伯惟教",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0856",
    },
    {
      label: "宇久玄雅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0857",
    },
    {
      label: "二木重高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0858",
    },
    {
      label: "高田又兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0859",
    },
    {
      label: "大宝寺義興",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0860",
    },
    {
      label: "大野治房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0861",
    },
    {
      label: "水原親憲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0862",
    },
    {
      label: "津軽信枚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0863",
    },
    {
      label: "小山田茂誠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0864",
    },
    {
      label: "十時連貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0865",
    },
    {
      label: "井伊直孝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0866",
    },
    {
      label: "片倉重長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0867",
    },
    {
      label: "成田長親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0868",
    },
    {
      label: "最上家親",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0869",
    },
    {
      label: "上田重安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0870",
    },
    {
      label: "小梁川宗朝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0871",
    },
    {
      label: "大国実頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0872",
    },
    {
      label: "梅津政景",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0873",
    },
    {
      label: "三淵藤英",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0874",
    },
    {
      label: "本多政重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0875",
    },
    {
      label: "栗山善助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0876",
    },
    {
      label: "多賀谷政広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0877",
    },
    {
      label: "土岐為頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0878",
    },
    {
      label: "舞兵庫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0879",
    },
    {
      label: "山上道及",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0880",
    },
    {
      label: "蜂須賀至鎮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0881",
    },
    {
      label: "真田信尹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0882",
    },
    {
      label: "伊東マンショ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0883",
    },
    {
      label: "宮部長房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0884",
    },
    {
      label: "朝比奈信置",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0885",
    },
    {
      label: "金森可重",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0886",
    },
    {
      label: "斯波義銀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0887",
    },
    {
      label: "毛利秀頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0888",
    },
    {
      label: "津川義冬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0889",
    },
    {
      label: "留守顕宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0890",
    },
    {
      label: "原長頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0891",
    },
    {
      label: "平塚為広",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0892",
    },
    {
      label: "妻木広忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0893",
    },
    {
      label: "鳥屋尾満栄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0894",
    },
    {
      label: "野村直隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0895",
    },
    {
      label: "土居清良",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0896",
    },
    {
      label: "島津忠直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0897",
    },
    {
      label: "一柳直末",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0898",
    },
    {
      label: "三木直頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0899",
    },
    {
      label: "杉浦玄任",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0900",
    },
    {
      label: "色部顕長",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0901",
    },
    {
      label: "中条藤資",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0902",
    },
    {
      label: "江上家種",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0903",
    },
    {
      label: "甘粕景継",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0904",
    },
    {
      label: "安田作兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0905",
    },
    {
      label: "河野通直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0906",
    },
    {
      label: "姉小路良頼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0907",
    },
    {
      label: "竹中久作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0908",
    },
    {
      label: "阿閉貞征",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0909",
    },
    {
      label: "森田浄雲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0910",
    },
    {
      label: "熊谷元直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0911",
    },
    {
      label: "明智光安",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0912",
    },
    {
      label: "別所重棟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0913",
    },
    {
      label: "小川祐忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0914",
    },
    {
      label: "吉弘鎮信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0915",
    },
    {
      label: "佃十成",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0916",
    },
    {
      label: "大谷吉治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0917",
    },
    {
      label: "有馬豊氏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0918",
    },
    {
      label: "神代勝利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0919",
    },
    {
      label: "赤星統家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0920",
    },
    {
      label: "伊集院忠朗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0921",
    },
    {
      label: "樺山久高",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0922",
    },
    {
      label: "藤田信吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0923",
    },
    {
      label: "間宮康俊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0924",
    },
    {
      label: "由布惟信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0925",
    },
    {
      label: "小浜光隆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0926",
    },
    {
      label: "天草四郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0927",
    },
    {
      label: "船越景直",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0928",
    },
    {
      label: "伊達小次郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0929",
    },
    {
      label: "金光文右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0930",
    },
    {
      label: "友野宗善",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0931",
    },
    {
      label: "多米元忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0932",
    },
    {
      label: "宇野源十郎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0933",
    },
    {
      label: "津田宗凡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0934",
    },
    {
      label: "末次平蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0935",
    },
    {
      label: "甘粕景持",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0936",
    },
    {
      label: "山崎吉家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0937",
    },
    {
      label: "唐沢玄蕃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0938",
    },
    {
      label: "植田光次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0939",
    },
    {
      label: "大林坊俊海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0940",
    },
    {
      label: "内田トメ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0941",
    },
    {
      label: "奥弥兵衛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0942",
    },
    {
      label: "秦泉寺豊後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0943",
    },
    {
      label: "後藤宗印",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0944",
    },
    {
      label: "愛洲元香斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0945",
    },
    {
      label: "上泉泰綱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0946",
    },
    {
      label: "瀬戸方久",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0947",
    },
    {
      label: "蘇我理右衛門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0948",
    },
    {
      label: "松下常慶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0949",
    },
    {
      label: "曲直瀬玄朔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0950",
    },
    {
      label: "三枝昌貞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0951",
    },
    {
      label: "石田正澄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0952",
    },
    {
      label: "一柳直盛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0953",
    },
    {
      label: "駒井高白斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0954",
    },
    {
      label: "鎌田政年",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0955",
    },
    {
      label: "清水景治",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0956",
    },
    {
      label: "千々石ミゲル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0957",
    },
    {
      label: "弥助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0958",
    },
    {
      label: "三浦按針",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0959",
    },
    {
      label: "大名家Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0960",
    },
    {
      label: "大名家Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0961",
    },
    {
      label: "大名家Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0962",
    },
    {
      label: "大名家Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0963",
    },
    {
      label: "大名家Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0964",
    },
    {
      label: "主人公大名家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0965",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0966",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("大名家::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionMerchantData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "鐙屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "伊藤屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "納屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "組屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "下関屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "越後屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "小西屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "大西屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "博多屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "茶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "虎屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "川舟屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "神屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "友野屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "簗田屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "坂田屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "天王寺屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "鴻池屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "末吉屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "播磨屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "角屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "山形屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "平野屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "淀屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "角倉屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "乾物屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "花屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "肉屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "魚屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "本屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "油屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "酒屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "床屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "飯屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "雑貨屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "呉服屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "金物屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "石屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "八百屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "豆腐屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "風呂屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "商家Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "商家Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "商家Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "商家Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "商家Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "主人公商家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("商家::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionNinjaData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "黒脛巾衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "戸隠衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "風魔衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "軒猿衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "透波衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "甲賀衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "伊賀衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "根来衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "鉢屋衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "外聞衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "山くぐり衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "羽黒衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "忍者衆Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "忍者衆Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "忍者衆Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "忍者衆Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "忍者衆Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "主人公忍者衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("忍者衆::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionPirateData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "安東水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "房総水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "相模水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "駿河水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "熊野水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "丹後水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "淡路水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "塩飽水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "村上水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "土佐水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "豊後水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "五島水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "坊津水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "江戸水軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "海賊衆Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "海賊衆Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "海賊衆Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "海賊衆Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "海賊衆Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "主人公海賊衆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("海賊衆::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionArmyData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "主人公軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "イベント用１軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "イベント用２軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "イベント用３軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "イベント用４軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "イベント用５軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "軍団Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "軍団Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "軍団Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "軍団Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "軍団Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "目標軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "軍団１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "軍団２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "軍団３",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "勝利軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("軍団::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionItemData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "松風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "帝釈栗毛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "放生月毛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "白石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "黒雲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "星崎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "三国黒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "近江黒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "小雲雀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "百段",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "会津黒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "駄馬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "聖騎士の鎧",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "蚩尤の鎧",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "黒葦威胴丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "色々威腹巻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "黒漆塗五枚胴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "金小札色々威",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "金陀美具足",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "銀陀美具足",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "赤糸威肩白鎧",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "熏辜素懸威",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "歯朶具足",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "赤糸威小腹巻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "縹糸下散紅威",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "南蛮胴具足",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "鎖具足",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "足軽具足",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "蜻蛉切",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "日本号",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "御手杵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "京信国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "一国長吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "菊池槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "半弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "管槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "鎌槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "十文字槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "片鎌槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "素槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "村雨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "莫邪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "村正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "正宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "鬼丸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "吉光骨喰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "貞宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "童子切",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "備前長船兼光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "菊一文字",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "三日月宗近",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "圧切",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "影秀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "定利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "小龍景光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "大典太",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "日光助真",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "瓶割刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "大般若長光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "天国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "雷切",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "郷義弘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "一期一振",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "児手柏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "名物桑山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "会津新藤五",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "物干竿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "数珠丸恒次",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "宗三左文字",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "素鎌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "福岡一文字",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "長光作薙刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "国光作短刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "長船小太刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "近江物脇差",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "脇差",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "無銘槍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "竹光",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "俵藤太の弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "鎮西八郎の弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "那須与一の弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "重籐弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "強弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "短弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "三連筒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "国友筒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "馬上筒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "種子島",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "石火矢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "無双苦無",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "日月流星",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "鋼手裏剣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "苦無",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "手裏剣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "飛槌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "黄泉の鎌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "黄金分銅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "忍び鎌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "鎖鎌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "四季山水図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "鶴図下絵和歌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "蒙古襲来絵詞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "瓢鮎図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "草花下絵和歌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "松鷹図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "那智瀧図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "墨竹図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "風雨山水図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "夕陽山水図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "漁村夕照図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "花鳥図絵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "竹鶏図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "唐様掛軸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "洛中洛外図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "松林図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "唐獅子図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "智積院楓図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "檜図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "観楓図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "花下遊楽図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "白菊図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "源氏物語図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "落書き図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "図書",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "文引",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "国王図書",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "日本国王印",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "日字勘合",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "本字勘合",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "渡航朱印状",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "交易朱印状",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "貿易朱印状",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "宝冠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "蘭奢待",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "ダイヤモンド",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "ルビーの指輪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "翡翠の首飾り",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "金塊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "大真珠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "鼈甲細工",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "佐渡金",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "石見銀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "小粒金",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "古事記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "日本書紀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "源氏物語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "枕草子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "啓迪集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "幻庵おほへ書",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "古今和歌集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "万葉集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "方丈記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "徒然草",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "伊勢物語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "竹取物語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "蜻蛉日記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "大鏡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "栄花物語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "節用集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "十訓抄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "手習い",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "春秋左氏伝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "論語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "尉繚子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "孟子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "文選",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "李衛公問対",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "大学",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "鬼谷子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "中庸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "史記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "五輪書",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "太平記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "平家物語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "錆びた銃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "資治通鑑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "愚管抄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "朝倉宗滴話記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "三島船戦要法",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "貞観政要",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "善隣国宝記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "廻船式目",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "吾妻鏡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "懐風藻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "伊曽保物語",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "和漢朗詠集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "孫子の秘奥義",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "呉子の秘奥義",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
    {
      label: "孫子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0188",
    },
    {
      label: "呉子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0189",
    },
    {
      label: "竹手裏剣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0190",
    },
    {
      label: "三略",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0191",
    },
    {
      label: "六韜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0192",
    },
    {
      label: "孟徳新書",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0193",
    },
    {
      label: "戦国策",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0194",
    },
    {
      label: "司馬法",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0195",
    },
    {
      label: "韓非子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0196",
    },
    {
      label: "泪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0197",
    },
    {
      label: "向獅子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0198",
    },
    {
      label: "千鳥の香炉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0199",
    },
    {
      label: "弱法師",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0200",
    },
    {
      label: "黄瀬戸花入",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0201",
    },
    {
      label: "青磁花入",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0202",
    },
    {
      label: "耳かき",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0203",
    },
    {
      label: "古天明平蜘蛛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0204",
    },
    {
      label: "乙御前の釜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0205",
    },
    {
      label: "霰釜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0206",
    },
    {
      label: "宋胡録",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0207",
    },
    {
      label: "芦屋釜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0208",
    },
    {
      label: "天明釜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0209",
    },
    {
      label: "九十九髪茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0210",
    },
    {
      label: "松嶋の壺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0211",
    },
    {
      label: "珠光小茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0212",
    },
    {
      label: "三日月茶壺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0213",
    },
    {
      label: "初花肩衝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0214",
    },
    {
      label: "楢柴肩衝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0215",
    },
    {
      label: "新田肩衝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0216",
    },
    {
      label: "紹鴎茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0217",
    },
    {
      label: "山井肩衝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0218",
    },
    {
      label: "朝倉文琳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0219",
    },
    {
      label: "宗悟茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0220",
    },
    {
      label: "橋立",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0221",
    },
    {
      label: "北野茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0222",
    },
    {
      label: "富士茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0223",
    },
    {
      label: "打曇大海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0224",
    },
    {
      label: "似たり茄子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0225",
    },
    {
      label: "橋姫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0226",
    },
    {
      label: "丹波茶壺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0227",
    },
    {
      label: "交趾茶入",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0228",
    },
    {
      label: "祥瑞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0229",
    },
    {
      label: "馬蝗絆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0230",
    },
    {
      label: "松本茶碗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0231",
    },
    {
      label: "不二山",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0232",
    },
    {
      label: "七里",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0233",
    },
    {
      label: "星建盞天目",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0234",
    },
    {
      label: "早船",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0235",
    },
    {
      label: "筒井筒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0236",
    },
    {
      label: "青井戸柴田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0237",
    },
    {
      label: "黒楽鉢開",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0238",
    },
    {
      label: "曜変稲葉天目",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0239",
    },
    {
      label: "朝鮮唐津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0240",
    },
    {
      label: "高麗茶碗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0241",
    },
    {
      label: "大井戸加賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0242",
    },
    {
      label: "白天目茶碗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0243",
    },
    {
      label: "黄瀬戸茶碗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0244",
    },
    {
      label: "黒楽茶碗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0245",
    },
    {
      label: "赤楽茶碗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0246",
    },
    {
      label: "古い丼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0247",
    },
    {
      label: "世界図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0248",
    },
    {
      label: "自鳴鐘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0249",
    },
    {
      label: "金時計",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0250",
    },
    {
      label: "ビードロ壺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0251",
    },
    {
      label: "銀時計",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0252",
    },
    {
      label: "ルソン壺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0253",
    },
    {
      label: "ロザリオ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0254",
    },
    {
      label: "望遠鏡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0255",
    },
    {
      label: "宝石箱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0256",
    },
    {
      label: "地球儀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0257",
    },
    {
      label: "十字架",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0258",
    },
    {
      label: "天球儀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0259",
    },
    {
      label: "オルゴール",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0260",
    },
    {
      label: "懐中時計",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0261",
    },
    {
      label: "チェンバロ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0262",
    },
    {
      label: "聖書",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0263",
    },
    {
      label: "フルート",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0264",
    },
    {
      label: "絨毯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0265",
    },
    {
      label: "香水",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0266",
    },
    {
      label: "事典",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0267",
    },
    {
      label: "孔雀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0268",
    },
    {
      label: "オウム",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0269",
    },
    {
      label: "キセル",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0270",
    },
    {
      label: "ワイングラス",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0271",
    },
    {
      label: "葉巻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0272",
    },
    {
      label: "マント",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0273",
    },
    {
      label: "金平糖",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0274",
    },
    {
      label: "シャボン",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0275",
    },
    {
      label: "福建茶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0276",
    },
    {
      label: "紅茶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0277",
    },
    {
      label: "カステラ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0278",
    },
    {
      label: "ガラス玉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0279",
    },
    {
      label: "ボーロ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0280",
    },
    {
      label: "バター",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0281",
    },
    {
      label: "どぶろく",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0282",
    },
    {
      label: "菊酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0283",
    },
    {
      label: "僧坊酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0284",
    },
    {
      label: "旨酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0285",
    },
    {
      label: "すみ酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0286",
    },
    {
      label: "珍陀酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0287",
    },
    {
      label: "無効薬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0288",
    },
    {
      label: "麦酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0289",
    },
    {
      label: "利休酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0290",
    },
    {
      label: "葡萄酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0291",
    },
    {
      label: "壮腎丹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0292",
    },
    {
      label: "透頂香",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0293",
    },
    {
      label: "特効薬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0294",
    },
    {
      label: "風邪薬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0295",
    },
    {
      label: "反魂丹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0296",
    },
    {
      label: "万金丹",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0297",
    },
    {
      label: "三芳野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0298",
    },
    {
      label: "分福茶釜",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0299",
    },
    {
      label: "樵夫蒔絵硯箱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0300",
    },
    {
      label: "雪峰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0301",
    },
    {
      label: "醒酔笑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0302",
    },
    {
      label: "飲中八仙図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0303",
    },
    {
      label: "琴棋書画図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0304",
    },
    {
      label: "雲龍図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0305",
    },
    {
      label: "牡丹梅花屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0306",
    },
    {
      label: "網干図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0307",
    },
    {
      label: "竹林七賢図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0308",
    },
    {
      label: "浜松図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0309",
    },
    {
      label: "遊楽図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0310",
    },
    {
      label: "枯木猿猴図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0311",
    },
    {
      label: "許由巣父図",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0312",
    },
    {
      label: "駑馬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0313",
    },
    {
      label: "樵談治要",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0314",
    },
    {
      label: "菟玖波集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0315",
    },
    {
      label: "新撰犬筑波集",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0316",
    },
    {
      label: "義経記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0317",
    },
    {
      label: "将門記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0318",
    },
    {
      label: "飛燕",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0319",
    },
    {
      label: "隼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0320",
    },
    {
      label: "紫電",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0321",
    },
    {
      label: "天鹿児弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0322",
    },
    {
      label: "八幡太郎の弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0323",
    },
    {
      label: "楠公の弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0324",
    },
    {
      label: "夜叉の鎌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0325",
    },
    {
      label: "羅刹の鎌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0326",
    },
    {
      label: "提婆達多",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0327",
    },
    {
      label: "瓶通し",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0328",
    },
    {
      label: "助宗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0329",
    },
    {
      label: "延寿国村",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0330",
    },
    {
      label: "一巴筒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0331",
    },
    {
      label: "雷公筒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0332",
    },
    {
      label: "アーゴット銃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0333",
    },
    {
      label: "神息",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0334",
    },
    {
      label: "千手院長吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0335",
    },
    {
      label: "沢瀉威鎧",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0336",
    },
    {
      label: "杵のをれ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0337",
    },
    {
      label: "土鍋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0338",
    },
    {
      label: "酸漿文琳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0339",
    },
    {
      label: "玉垣文琳",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0340",
    },
    {
      label: "捨子",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0341",
    },
    {
      label: "東陽坊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0342",
    },
    {
      label: "万歳大海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0343",
    },
    {
      label: "袴腰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0344",
    },
    {
      label: "二人静",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0345",
    },
    {
      label: "舟橋蒔絵硯箱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0346",
    },
    {
      label: "車争図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0347",
    },
    {
      label: "帝鑑図屏風",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0348",
    },
    {
      label: "神馬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0349",
    },
    {
      label: "兵法二十四編",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0350",
    },
    {
      label: "兵法三十六計",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0351",
    },
    {
      label: "政事要略",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0352",
    },
    {
      label: "清良記",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0353",
    },
    {
      label: "陰之流私",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0354",
    },
    {
      label: "アイテムＡ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0355",
    },
    {
      label: "アイテムＢ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0356",
    },
    {
      label: "アイテムＣ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0357",
    },
    {
      label: "アイテムＤ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0358",
    },
    {
      label: "アイテムＥ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0359",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0360",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("アイテム::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionRegionData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "東北",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "北陸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "甲信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "関東",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "東海",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "近畿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "中国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "四国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "九州",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "海外",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "地方Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "地方Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "地方Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "地方Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "地方Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("地方::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionCountryData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "蝦夷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "陸奥",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "陸中",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "陸前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "羽後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "羽前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "岩代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "常陸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "下野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "上野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "上総・安房",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "下総",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "武蔵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "相模・伊豆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "越後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "越中",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "能登",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "加賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "越前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "北信濃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "南信濃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "甲斐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "駿河",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "遠江",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "三河",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "尾張",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "美濃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "飛騨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "伊勢・志摩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "北近江",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "南近江",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "大和・伊賀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "山城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "丹波",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "丹後・若狭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "河内・和泉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "摂津",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "紀伊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "但馬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "因幡・伯耆",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "出雲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "石見",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "播磨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "美作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "備前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "備中",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "備後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "安芸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "周防・長門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "讃岐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "伊予",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "阿波・淡路",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "土佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "筑前・対馬",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "筑後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "肥前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "肥後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "豊前",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "豊後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "日向",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "大隅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "薩摩",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "朝鮮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "明",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "琉球",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "南蛮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "国Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "国Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "国Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "国Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "国Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("国::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionYagoData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "鐙",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "伊藤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "納",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "組",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "下関",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "越後",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "小西",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "大西",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "博多",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "茶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "虎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "川舟",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "神",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "友野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "簗田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "坂田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "天王寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "鴻池",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "末吉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "播磨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "角",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "山形",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "平野",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "淀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "角倉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("屋号::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionRyuhaData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "一刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "新陰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "新当",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "中条",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "吉岡",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "津田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "林崎夢想",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "一羽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "小野一刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "天",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "巌",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "佐分利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "示顕",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "宝蔵院",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "二天一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "微塵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "柳生新陰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "タイ捨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "霞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "稲富",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "日置",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "鐘捲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "随波斎",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "高田",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "陰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "流派Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "流派Ｂ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "流派Ｃ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "流派Ｄ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "流派Ｅ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "主人公流派",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("流派::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionMibunData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "浪人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "足軽組頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "足軽大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "侍大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "部将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "家老",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "城主",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "国主",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "大名",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "見習い",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "手代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "番頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "支配人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "当主",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "下忍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "中忍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "上忍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "元締",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "水夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "水夫頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "船頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "船大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "頭領",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "天皇",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "公家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "武家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "農民",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "町人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "職人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "茶人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "僧侶",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "師範代",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "師範",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "南蛮人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "旅人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "店主",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "女将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "医師",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "鍛冶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "門番",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "小者",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "小姓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "忍者",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "娘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "賊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "主人公身分",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("身分::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionKanshokuData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "佐渡守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "能登守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "若狭守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "丹後守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "石見守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "長門守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "土佐守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "日向守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "薩摩守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "大隅守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "隼人正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "主水正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "織部正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "采女正",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "弾正忠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "右近将監",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "左近将監",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "飛騨守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "安房守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "伊豆守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "志摩守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "伊賀守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "和泉守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "隠岐守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "淡路守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "壱岐守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "対馬守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "上野介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "常陸介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "上総介",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "式部少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "治部少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "民部少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "宮内少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "兵部少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "大蔵少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "刑部少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "大炊頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "修理亮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "右京亮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "左京亮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "中務少輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "右衛門佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "左衛門佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "出羽守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "越後守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "越中守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "加賀守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "下野守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "甲斐守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "信濃守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "美濃守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "相模守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "駿河守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "遠江守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "三河守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "尾張守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "山城守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "摂津守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "丹波守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "但馬守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "因幡守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "伯耆守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "出雲守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "備前守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "備中守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "備後守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "美作守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "安芸守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "周防守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "紀伊守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "阿波守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "讃岐守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "伊予守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "豊前守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "豊後守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "筑前守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "筑後守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "肥前守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "少納言",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "侍従",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "図書頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "雅楽頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "玄蕃頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "大学頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "兵庫頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "右馬頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "左馬頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "掃部頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "右兵衛佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "左兵衛佐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "式部大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "治部大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "民部大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "宮内大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "兵部大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "大蔵大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "刑部大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "右近衛少将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "左近衛少将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "弾正少弼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "陸奥守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "下総守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "武蔵守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "越前守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "近江守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "伊勢守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "大和守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "河内守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "播磨守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "肥後守",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "大膳大夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "太宰少弐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "右中弁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "左中弁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "中務大輔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "右京大夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "左京大夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "太宰大弐",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "弾正大弼",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "右近衛中将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "左近衛中将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "右衛門督",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "左衛門督",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "右兵衛督",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "左兵衛督",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "修理大夫",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "右大弁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "左大弁",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "式部卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "治部卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "民部卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "宮内卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "兵部卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "大蔵卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "刑部卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "中務卿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "参議",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "右近衛大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "左近衛大将",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "権中納言",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "中納言",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "権大納言",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "大納言",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "内大臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "右大臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "左大臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "太政大臣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "関白",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "征夷大将軍",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "主人公官職",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("官職::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionKaniData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "正六位下",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "従五位下",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "従五位上",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "正五位下",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "正五位上",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "従四位下",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "従四位上",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "正四位下",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "正四位上",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "従三位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "正三位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "従二位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "正二位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "従一位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "正一位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "主人公官位",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("官位::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionTradeAreaData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "北みちのく",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "南みちのく",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "北陸",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "北関東",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "南関東",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "甲信",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "東中部",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "西中部",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "北近畿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "南近畿",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "山陰",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "山陽",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "四国",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "北九州",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "南九州",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("交易エリア::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionWeatherData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "晴れ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0",
    },
    {
      label: "曇り",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1",
    },
    {
      label: "雨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "2",
    },
    {
      label: "雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "3",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("天気::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionSceneData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "城主の間",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "武家宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "城練兵場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "米屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "馬屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "酒場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "宿屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "民家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "商家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "医師宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "茶人宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "鍛冶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "職人宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "南蛮寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "南蛮商館",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "公家宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "皇居",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "座",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "道場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "海外交易所",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "忍び屋敷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "里練兵場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "里修業場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "忍び宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "海賊屋敷",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "砦練兵場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "砦修業場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "造船所",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "海賊宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "評定の間",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "主人公評定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "自宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "主人公道場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "主人公鍛冶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "主人公診療所",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "主人公茶室",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "拠点内画面",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "日本マップ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "南海マップ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "賭博所",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "個人戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "戦況画面",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "合戦画面",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "発生施設",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "無効",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("場面::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionFieldBackgroundData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "陸道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0",
    },
    {
      label: "海道",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "1",
    },
    {
      label: "辻",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "2",
    },
    {
      label: "初期設定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "3",
    },
    {
      label: "コーエイロゴ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "4",
    },
    {
      label: "初期設定・赤",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "5",
    },
    {
      label: "ダーク",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "6",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("フィールド背景::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionEventStillData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "墨俣築城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "安土築城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "大坂築城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "川中島の両雄",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "三本の矢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "正徳寺会見",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "本能寺の変",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "真田十勇士",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "小山評定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "お市御寮人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "高松城水攻め",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "輝宗の死",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "三日天下",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "長篠合戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "真田隊突入",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "義昭の陰謀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "信長の葬儀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "鹿介、月に誓う",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "鉄甲船出渠",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "敦盛を舞う",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "堀埋め",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "巌流島の決戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "空城の計",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "天下布武の印",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "方広寺鐘銘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "五右衛門釜ゆで",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "桶狭間奇襲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "中国大返し",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "ドクロの酒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "官兵衛救出",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "北野大茶会",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "死去",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "出陣",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "落城",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "攻城戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "野戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "海戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "敗戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "勝ち鬨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "議論",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "上洛",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "処断",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "厳刑",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "暗殺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "宴席",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "婚儀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "大名臣従",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "正一位拝命",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "歌舞伎踊り一座",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "寺社焼き討ち",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "天下統一",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "天下統一補助",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "エンディング商人１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "エンディング商人２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "エンディング忍者１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "エンディング忍者２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "エンディング剣豪１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "エンディング剣豪２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "エンディング海賊１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "エンディング海賊２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "エンディング医師",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "エンディング鍛冶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "エンディング茶人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "エンディング農民",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "エンディング風流人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "エンディング傾奇者",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "平和な町",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "阿鼻叫喚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "強右衛門、磔",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "ねねと結婚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "剣豪将軍の最期",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "さらば親父",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "義隆の最期",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "光秀打擲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "エンディング旅人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "エンディング修羅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "エンディング軍師",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "エンディング義賊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "エンディング作家",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("イベント用スチル::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionBgmData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "メイン大名",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "メイン上級武士",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "メイン下級武士",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "メイン浪人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "メイン商人",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "メイン商人当主",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "メイン忍者",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "メイン忍者頭",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "メイン海賊",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "メイン海賊頭領",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "メイン剣豪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "自宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "京都",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "評定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "茶人宅",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "酒場",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "南蛮",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "海外拠点",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "軍団移動",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "野戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "攻城戦",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "個人戦闘",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "商いの華",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "ミニゲーム",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "イベント悲しい",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "イベント嬉しい",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "イベント決意",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "イベント危機",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "イベント本能寺",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "イベントほんのり",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "初期設定",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "ゲームオーバー",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "正規エンディング",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "ミニエンディング",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "賊出現",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "デフォルト",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "ＢＧＭなし",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("ＢＧＭ::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionSoundEffectData extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "決定音（ポン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0000",
    },
    {
      label: "キャンセル音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0001",
    },
    {
      label: "セレクト音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0002",
    },
    {
      label: "成功音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0003",
    },
    {
      label: "失敗音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0004",
    },
    {
      label: "レベルアップ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0005",
    },
    {
      label: "バー上昇",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0006",
    },
    {
      label: "バー減少",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0007",
    },
    {
      label: "忍者報告",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0008",
    },
    {
      label: "画面転換音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0009",
    },
    {
      label: "決定音（バーン！）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0010",
    },
    {
      label: "禁止音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0011",
    },
    {
      label: "無音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0012",
    },
    {
      label: "決定音（ドン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0013",
    },
    {
      label: "通常札獲得音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0014",
    },
    {
      label: "コンボ札獲得音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0015",
    },
    {
      label: "同名札獲得音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0016",
    },
    {
      label: "開門",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0017",
    },
    {
      label: "休養（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0018",
    },
    {
      label: "休養（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0019",
    },
    {
      label: "鳥（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0020",
    },
    {
      label: "セミ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0021",
    },
    {
      label: "カラス",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0022",
    },
    {
      label: "ししおどし（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0023",
    },
    {
      label: "鍛冶屋",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0024",
    },
    {
      label: "木魚（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0025",
    },
    {
      label: "雑踏（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0026",
    },
    {
      label: "殴られる（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0027",
    },
    {
      label: "単発げんこつ（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0028",
    },
    {
      label: "単発平手（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0029",
    },
    {
      label: "歓声（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0030",
    },
    {
      label: "物音（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0031",
    },
    {
      label: "ねずみの鳴き真似（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0032",
    },
    {
      label: "猫の鳴き真似（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0033",
    },
    {
      label: "鼓の音（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0034",
    },
    {
      label: "飛び込み",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0035",
    },
    {
      label: "暴風雨Ａ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0036",
    },
    {
      label: "暗黒コマンド",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0037",
    },
    {
      label: "初期設定のスロット停止",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0038",
    },
    {
      label: "建設工事音（商人司）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0039",
    },
    {
      label: "お囃子（商人司）（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0040",
    },
    {
      label: "生薬をくだく（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0041",
    },
    {
      label: "クワで地面を掘る（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0042",
    },
    {
      label: "プレイヤー勝利（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0043",
    },
    {
      label: "シッピン知らせる（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0044",
    },
    {
      label: "アラシ知らせる（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0045",
    },
    {
      label: "ミニゲーム開始音（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0046",
    },
    {
      label: "残念な音（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0047",
    },
    {
      label: "刀で斬られる２（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0048",
    },
    {
      label: "回復（メイン）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0049",
    },
    {
      label: "雨(メイン)",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0050",
    },
    {
      label: "雪(メイン)",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0051",
    },
    {
      label: "移動・船(メイン)",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0052",
    },
    {
      label: "サイコロ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0053",
    },
    {
      label: "札配り音（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0054",
    },
    {
      label: "札めくり音（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0055",
    },
    {
      label: "コイン（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0056",
    },
    {
      label: "賭場スペシャル①",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0057",
    },
    {
      label: "賭場スペシャル②",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0058",
    },
    {
      label: "賭場スペシャル③",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0059",
    },
    {
      label: "プレイヤー勝利（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0060",
    },
    {
      label: "プレイヤー敗北",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0061",
    },
    {
      label: "ジョーズ①",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0062",
    },
    {
      label: "ジョーズ②",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0063",
    },
    {
      label: "カード勝負めくり",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0064",
    },
    {
      label: "カードに賭ける",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0065",
    },
    {
      label: "かぶ知らせる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0066",
    },
    {
      label: "シッピン知らせる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0067",
    },
    {
      label: "アラシ知らせる（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0068",
    },
    {
      label: "ピンころ払う（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0069",
    },
    {
      label: "オイチョカブで花札をクリックする音（賭博）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0070",
    },
    {
      label: "移動・歩兵（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0071",
    },
    {
      label: "移動・騎兵（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0072",
    },
    {
      label: "移動・砲兵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0073",
    },
    {
      label: "移動・船（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0074",
    },
    {
      label: "移動・大型船（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0075",
    },
    {
      label: "移動・鉄甲船",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0076",
    },
    {
      label: "移動・忍者軍団",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0077",
    },
    {
      label: "通常攻撃（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0078",
    },
    {
      label: "突撃（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0079",
    },
    {
      label: "騎馬突撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0080",
    },
    {
      label: "馬いななき（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0081",
    },
    {
      label: "弓矢攻撃（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0082",
    },
    {
      label: "鉄砲攻撃（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0083",
    },
    {
      label: "鉄砲連射（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0084",
    },
    {
      label: "大筒発射（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0085",
    },
    {
      label: "大筒着弾（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0086",
    },
    {
      label: "大型船艦砲射撃（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0087",
    },
    {
      label: "鉄甲船艦砲射撃（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0088",
    },
    {
      label: "鉄甲船遠距離砲着弾１（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0089",
    },
    {
      label: "鉄甲船遠距離砲着弾２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0090",
    },
    {
      label: "鉄甲船遠距離砲着弾３",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0091",
    },
    {
      label: "悲鳴（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0092",
    },
    {
      label: "鯨波（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0093",
    },
    {
      label: "虚報・忍び込み（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0094",
    },
    {
      label: "虚報・成功（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0095",
    },
    {
      label: "混乱",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0096",
    },
    {
      label: "工作（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0097",
    },
    {
      label: "鼓舞（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0098",
    },
    {
      label: "罵倒（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0099",
    },
    {
      label: "落とし穴（落下）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0100",
    },
    {
      label: "落とし穴（悲鳴）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0101",
    },
    {
      label: "雨（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0102",
    },
    {
      label: "雪（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0103",
    },
    {
      label: "爆発・小（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0104",
    },
    {
      label: "爆発・大（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0105",
    },
    {
      label: "恫喝（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0106",
    },
    {
      label: "士気を減らす（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0107",
    },
    {
      label: "火矢（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0108",
    },
    {
      label: "強弓（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0109",
    },
    {
      label: "弓矢当り（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0110",
    },
    {
      label: "鉄砲当り（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0111",
    },
    {
      label: "刀で斬られる２（野戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0112",
    },
    {
      label: "弓矢攻撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0113",
    },
    {
      label: "鉄砲攻撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0114",
    },
    {
      label: "大筒発射（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0115",
    },
    {
      label: "大筒着弾（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0116",
    },
    {
      label: "大型船艦砲射撃（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0117",
    },
    {
      label: "鉄甲船艦砲射撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0118",
    },
    {
      label: "鉄甲船遠距離砲着弾１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0119",
    },
    {
      label: "城攻撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0120",
    },
    {
      label: "城強襲（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0121",
    },
    {
      label: "虚報・忍び込み",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0122",
    },
    {
      label: "虚報・成功",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0123",
    },
    {
      label: "落石",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0124",
    },
    {
      label: "工作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0125",
    },
    {
      label: "鼓舞（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0126",
    },
    {
      label: "罵倒（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0127",
    },
    {
      label: "酒宴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0128",
    },
    {
      label: "放火・成功（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0129",
    },
    {
      label: "雨",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0130",
    },
    {
      label: "雪",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0131",
    },
    {
      label: "爆発・小（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0132",
    },
    {
      label: "爆発・大（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0133",
    },
    {
      label: "恫喝",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0134",
    },
    {
      label: "土竜攻め（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0135",
    },
    {
      label: "熱湯",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0136",
    },
    {
      label: "火急普請",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0137",
    },
    {
      label: "士気を減らす",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0138",
    },
    {
      label: "火矢",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0139",
    },
    {
      label: "強弓",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0140",
    },
    {
      label: "弓矢当り",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0141",
    },
    {
      label: "鉄砲当り",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0142",
    },
    {
      label: "刀で斬られる１（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0143",
    },
    {
      label: "気合いを溜める（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0144",
    },
    {
      label: "回復（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0145",
    },
    {
      label: "能力上昇（攻城戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0146",
    },
    {
      label: "歩く（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0147",
    },
    {
      label: "鉄砲玉を弾き返す",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0148",
    },
    {
      label: "刀同士ぶつかる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0149",
    },
    {
      label: "刀空振り（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0150",
    },
    {
      label: "槍振り回す（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0151",
    },
    {
      label: "刀で斬られる１（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0152",
    },
    {
      label: "刀で斬られる２（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0153",
    },
    {
      label: "槍に突かれる（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0154",
    },
    {
      label: "弓矢が刺さる（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0155",
    },
    {
      label: "分銅を投げる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0156",
    },
    {
      label: "苦無を投げる（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0157",
    },
    {
      label: "苦無を投げる（複数）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0158",
    },
    {
      label: "弓矢発射（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0159",
    },
    {
      label: "弓矢発射（複数）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0160",
    },
    {
      label: "鉄砲発射（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0161",
    },
    {
      label: "気合いを溜める（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0162",
    },
    {
      label: "回復（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0163",
    },
    {
      label: "能力上昇（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0164",
    },
    {
      label: "煙玉（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0165",
    },
    {
      label: "分身出現",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0166",
    },
    {
      label: "小判をばらまく（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0167",
    },
    {
      label: "犬が唸る",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0168",
    },
    {
      label: "犬がかみつく",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0169",
    },
    {
      label: "魅了する",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0170",
    },
    {
      label: "納刀（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0171",
    },
    {
      label: "倒れる（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0172",
    },
    {
      label: "鉄砲着弾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0173",
    },
    {
      label: "奇声（男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0174",
    },
    {
      label: "奇声（女）（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0175",
    },
    {
      label: "チェストー（男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0176",
    },
    {
      label: "チェストー（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0177",
    },
    {
      label: "バカにする（男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0178",
    },
    {
      label: "バカにする（女）（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0179",
    },
    {
      label: "うめき声（男）（個人戦）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0180",
    },
    {
      label: "うめき声２（男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0181",
    },
    {
      label: "うめき声３（男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0182",
    },
    {
      label: "うめき声（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0183",
    },
    {
      label: "うめき声２（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0184",
    },
    {
      label: "うめき声３（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0185",
    },
    {
      label: "うめき声（弱い男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0186",
    },
    {
      label: "うめき声２（弱い男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0187",
    },
    {
      label: "うめき声３（弱い男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0188",
    },
    {
      label: "スチル演出（滝）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0189",
    },
    {
      label: "スチル演出（月）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0190",
    },
    {
      label: "スチル演出（森林）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0191",
    },
    {
      label: "スチル演出（混沌）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0192",
    },
    {
      label: "スチル演出（般若面）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0193",
    },
    {
      label: "スチル演出（水面）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0194",
    },
    {
      label: "スチル演出（炎）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0195",
    },
    {
      label: "スチル演出（大波）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0196",
    },
    {
      label: "スチル演出（太陽）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0197",
    },
    {
      label: "スチル演出（桜）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0198",
    },
    {
      label: "スチル演出（阿修羅）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0199",
    },
    {
      label: "スチル演出（溶岩）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0200",
    },
    {
      label: "猫だまし",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0201",
    },
    {
      label: "札配り音（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0202",
    },
    {
      label: "札めくり音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0203",
    },
    {
      label: "コイン（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0204",
    },
    {
      label: "プレイヤー勝利",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0205",
    },
    {
      label: "アラシ知らせる（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0206",
    },
    {
      label: "クリア音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0207",
    },
    {
      label: "成功音(ミニゲーム)",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0208",
    },
    {
      label: "選択音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0209",
    },
    {
      label: "破壊工作・反射音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0210",
    },
    {
      label: "破壊工作・破壊音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0211",
    },
    {
      label: "破壊工作・発射音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0212",
    },
    {
      label: "破壊工作・吸収音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0213",
    },
    {
      label: "反射音（放火）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0214",
    },
    {
      label: "破壊音（放火）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0215",
    },
    {
      label: "反射音（流言）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0216",
    },
    {
      label: "破壊音（流言）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0217",
    },
    {
      label: "スロット回転",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0218",
    },
    {
      label: "開墾・土地造成音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0219",
    },
    {
      label: "開墾・水が流れる音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0220",
    },
    {
      label: "建築・木材セット",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0221",
    },
    {
      label: "建築・木材オフ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0222",
    },
    {
      label: "礼法・列移動",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0223",
    },
    {
      label: "弓術・弓を単発で撃つ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0224",
    },
    {
      label: "鉄砲・撃つ音（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0225",
    },
    {
      label: "的に当たる音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0226",
    },
    {
      label: "弓術・強さボタン",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0227",
    },
    {
      label: "弓術・弓を引き絞る音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0228",
    },
    {
      label: "鉄砲・弓の角度調整",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0229",
    },
    {
      label: "騎馬・矢に当たった音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0230",
    },
    {
      label: "騎馬・走る音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0231",
    },
    {
      label: "騎馬・壁に当たった音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0232",
    },
    {
      label: "騎馬・無敵状態（鼻息）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0233",
    },
    {
      label: "軍学・札が消える音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0234",
    },
    {
      label: "軍学・落下音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0235",
    },
    {
      label: "ミニゲーム開始音（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0236",
    },
    {
      label: "ミニゲーム終了音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0237",
    },
    {
      label: "残念な音（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0238",
    },
    {
      label: "ひしゃくで汲む音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0239",
    },
    {
      label: "茶碗に液体を入れる音（ミニゲーム）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0240",
    },
    {
      label: "医術失敗",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0241",
    },
    {
      label: "茶道・箱が開く音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0242",
    },
    {
      label: "建築・木材を回転させる音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0243",
    },
    {
      label: "オイチョカブで花札をクリックする音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0244",
    },
    {
      label: "瓶割り",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0245",
    },
    {
      label: "刀を鞘から抜く",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0246",
    },
    {
      label: "引き戸を開ける",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0247",
    },
    {
      label: "大筒の弾が飛来する",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0248",
    },
    {
      label: "鉄砲・撃つ音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0249",
    },
    {
      label: "茶碗に液体を入れる音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0250",
    },
    {
      label: "無敵状態",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0251",
    },
    {
      label: "移動・歩兵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0252",
    },
    {
      label: "移動・騎兵",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0253",
    },
    {
      label: "移動・船",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0254",
    },
    {
      label: "移動・大型船",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0255",
    },
    {
      label: "馬いななき",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0256",
    },
    {
      label: "鉄砲連射",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0257",
    },
    {
      label: "大筒発射",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0258",
    },
    {
      label: "大筒着弾",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0259",
    },
    {
      label: "大型船艦砲射撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0260",
    },
    {
      label: "城強襲",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0261",
    },
    {
      label: "鼓舞",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0262",
    },
    {
      label: "罵倒",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0263",
    },
    {
      label: "爆発・小",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0264",
    },
    {
      label: "爆発・大",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0265",
    },
    {
      label: "土竜攻め",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0266",
    },
    {
      label: "歩く",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0267",
    },
    {
      label: "刀同士ぶつかる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0268",
    },
    {
      label: "刀空振り",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0269",
    },
    {
      label: "槍振り回す",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0270",
    },
    {
      label: "刀で斬られる１",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0271",
    },
    {
      label: "刀で斬られる２",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0272",
    },
    {
      label: "槍に突かれる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0273",
    },
    {
      label: "弓矢が刺さる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0274",
    },
    {
      label: "苦無を投げる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0275",
    },
    {
      label: "弓矢発射",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0276",
    },
    {
      label: "鉄砲発射",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0277",
    },
    {
      label: "気合いを溜める",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0278",
    },
    {
      label: "回復",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0279",
    },
    {
      label: "能力上昇",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0280",
    },
    {
      label: "煙玉",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0281",
    },
    {
      label: "小判をばらまく",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0282",
    },
    {
      label: "納刀",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0283",
    },
    {
      label: "倒れる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0284",
    },
    {
      label: "奇声（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0285",
    },
    {
      label: "バカにする（女）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0286",
    },
    {
      label: "うめき声（男）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0287",
    },
    {
      label: "札配り音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0288",
    },
    {
      label: "コイン",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0289",
    },
    {
      label: "アラシ知らせる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0290",
    },
    {
      label: "ピンころ払う",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0291",
    },
    {
      label: "休養",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0292",
    },
    {
      label: "ししおどし",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0293",
    },
    {
      label: "木魚",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0294",
    },
    {
      label: "殴られる",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0295",
    },
    {
      label: "単発げんこつ",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0296",
    },
    {
      label: "単発平手",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0297",
    },
    {
      label: "物音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0298",
    },
    {
      label: "ねずみの鳴き真似",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0299",
    },
    {
      label: "猫の鳴き真似",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0300",
    },
    {
      label: "鼓の音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0301",
    },
    {
      label: "生薬をくだく",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0302",
    },
    {
      label: "クワで地面を掘る",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0303",
    },
    {
      label: "数人が走り寄る",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0304",
    },
    {
      label: "ミニゲーム開始音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0305",
    },
    {
      label: "残念な音",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0306",
    },
    {
      label: "通常攻撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0307",
    },
    {
      label: "突撃",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0308",
    },
    {
      label: "悲鳴",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0309",
    },
    {
      label: "鯨波",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0310",
    },
    {
      label: "放火・成功",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0311",
    },
    {
      label: "水攻め工作",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0312",
    },
    {
      label: "鳥",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0313",
    },
    {
      label: "雑踏",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0314",
    },
    {
      label: "歓声",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0315",
    },
    {
      label: "お囃子（商人司）",
      kind: vscode.CompletionItemKind.Unit,
      sortText: "0316",
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (linePrefix.endsWith("効果音::")) {
      return this.items;
    }
    return this.provideTypingItems(document, position);
  }
}

class SuggestionArithmeticOperator extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "+",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "-",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "*",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "/",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "%",
      kind: vscode.CompletionItemKind.Operator,
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (
      /^\t*調査:\(.*\)[^(]*$/g.test(linePrefix) ||
      /^\t*代入[^:]*:\(.*\)[^(]*$/g.test(linePrefix)
    ) {
      return this.items;
    }
    return undefined;
  }
}

class SuggestionComparisonOperator extends AbstractSuggestionItemGroup {
  items = [
    {
      label: "==",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "!=",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: ">",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "<",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: ">=",
      kind: vscode.CompletionItemKind.Operator,
    },
    {
      label: "<=",
      kind: vscode.CompletionItemKind.Operator,
    },
  ];

  provideItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);
    if (
      /^\t*調査:\(.*\)[^(]*$/g.test(linePrefix) ||
      /^\t*代入[^:]*:\(.*\)[^(]*$/g.test(linePrefix)
    ) {
      return this.items;
    }
    return undefined;
  }
}

class SuggestionItemsProvider {
  groups: AbstractSuggestionItemGroup[];

  constructor(groups: AbstractSuggestionItemGroup[]) {
    this.groups = groups;
  }

  // TODO(tarot-shogun): create enable() function to improve a process speed.

  provideCompletionItem(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    let completionItems: vscode.CompletionItem[] | undefined = [];
    for (const group of this.groups) {
      const items = group.provideItems(document, position);
      if (items != undefined) {
        completionItems = completionItems.concat(items);
      }
    }
    if (completionItems.length > 0) {
      return completionItems;
    }
    return undefined;
  }
}

export class FirstSnippetProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const suggestions = new SuggestionItemsProvider([
      new SuggestionFirstSnippet(),
    ]);
    return suggestions.provideCompletionItem(document, position);
  }
}

export class AttributeTypeProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const suggestions = new SuggestionItemsProvider([
      new SuggestionAttributeType(),
    ]);
    return suggestions.provideCompletionItem(document, position);
  }
}

export class TriggerTypeProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const suggestions = new SuggestionItemsProvider([
      new SuggestionTriggerType(),
    ]);
    return suggestions.provideCompletionItem(document, position);
  }
}

export class SnippetFunctionProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const suggestions = new SuggestionItemsProvider([
      new SuggestionSnippetFunction(),
      new SuggestionSnippetValidateFunction(),
      new SuggestionSnippetSubstitutionFunction(),
    ]);
    return suggestions.provideCompletionItem(document, position);
  }
}

export class OperatorProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const suggestions = new SuggestionItemsProvider([
      new SuggestionComparisonOperator(),
      new SuggestionArithmeticOperator(),
    ]);
    return suggestions.provideCompletionItem(document, position);
  }
}

export class ClassTypeProvider implements vscode.CompletionItemProvider {
  public provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const suggestions = new SuggestionItemsProvider([
      new SuggestionClassType(),
      new SuggestionPersonClassSnippet(),
      new SuggestionPersonData(),
      new SuggestionHubData(),
      new SuggestionCityData(),
      new SuggestionCastleData(),
      new SuggestionVillageData(),
      new SuggestionSeaFortData(),
      new SuggestionBgmData(),
      new SuggestionSoundEffectData(),
    ]);
    return suggestions.provideCompletionItem(document, position);
  }
}

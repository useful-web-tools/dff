<?php
$pageTitle = 'Text Diff Tool';
$pageDescription = 'A browser-based text diff tool. Text comparison runs in the browser, and uploaded Office files are only sent to the local extract-text.php endpoint for text extraction.';
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
    <meta name="description" content="<?= htmlspecialchars($pageDescription, ENT_QUOTES, 'UTF-8') ?>">
    <link rel="stylesheet" href="styles.css">
    <script defer src="vendor/diff.min.js"></script>
    <script defer src="script.js"></script>
</head>
<body>
    <div class="c">
        <header class="tool-header">
            <h1 data-i18n="title">テキスト比較ツール（Diff）</h1>
            <p data-i18n="subtitle">追記と削除をすっきり見比べられる、シンプルな差分チェックツールです。</p>
        </header>

        <main>
            <section class="diff-shell">
                <div class="pc input-panels">
                    <div class="p input-card">
                        <div class="input-card-header">
                            <label for="ot" data-i18n="originalTextLabel">元のテキスト</label>
                        </div>
                        <textarea id="ot" class="drop-target" data-i18n-placeholder="originalTextPlaceholder"
                            placeholder="ここに元のテキストを入力する、またはファイルをドロップしてください…"></textarea>
                    </div>
                    <div class="p input-card">
                        <div class="input-card-header">
                            <label for="ct" data-i18n="changedTextLabel">変更後テキスト</label>
                        </div>
                        <textarea id="ct" class="drop-target" data-i18n-placeholder="changedTextPlaceholder"
                            placeholder="ここに変更後のテキストを入力する、またはファイルをドロップしてください…"></textarea>
                    </div>
                </div>

                <div class="as action-stack">
                    <button id="cb" data-i18n="compareBtn">比較する</button>

                    <div class="diff-summary" id="diff-summary" style="display: none;">
                        <div class="summary-chip summary-chip-add">
                            <span data-i18n="addedCountLabel">追記箇所</span>
                            <strong id="add-count">0件</strong>
                        </div>
                        <div class="summary-chip summary-chip-remove">
                            <span data-i18n="removedCountLabel">削除箇所</span>
                            <strong id="remove-count">0件</strong>
                        </div>
                    </div>
                </div>
            </section>

            <div class="pc rp" id="rps" style="display: none; margin-top: 2rem;">
                <div class="p">
                    <div class="label-wrap">
                        <label data-i18n="originalDiffLabel">元のテキスト</label>
                        <label id="doo-count"></label>
                    </div>
                    <div id="doo" class="do"></div>
                </div>
                <div class="p">
                    <div class="label-wrap">
                        <label data-i18n="changedDiffLabel">変更点</label>
                        <label id="doc-count"></label>
                    </div>
                    <div id="doc" class="do"></div>
                </div>
            </div>

            <div class="as" id="ba" style="display: none; margin-top: 2rem;">
                <button id="clb" data-i18n="clearBtn" class="secondary">クリア</button>
            </div>
        </main>
    </div>
</body>
</html>

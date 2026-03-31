# Text Diff Tool

Text Diff Tool is a simple, web-based online tool for comparing two texts.
The software is open source, and freely available to all users.

ウェブベースのテキスト比較ツールです。2つのテキストを比較し、追記箇所と削除箇所を見やすく表示します。
本ソフトウェアはオープンソースであり、誰でも無償で自由に利用することができます。

稼働中：
https://useful-web-tools.com/diff/

「比較処理がどうなっているか確認したい」
「入力テキストをどこにも送らない構成を自分で確認したい」
といった用途に対応しやすいよう、ソースを公開することにしました。どうぞご利用ください。

このツールでは、通常のテキスト比較はブラウザ内で実行しています。
差分表示には `jsdiff` を利用しており、ライブラリもローカル配置しています。
そのため、通常のテキスト比較では外部 CDN に依存せずに動作します。

また、`docx`、`xlsx`、`pptx`、`odt`、`rtf` などのファイルを読み込む場合は、
`extract-text.php` にファイルを送って本文を抽出します。

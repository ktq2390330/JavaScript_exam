document.addEventListener('DOMContentLoaded', async () => {
    // CodeMirrorエディタをtextarea要素に適用
    const editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
        lineNumbers: true,
        mode: 'python',
        theme: 'default'
    });

    // Pyodideの初期化
    const pyodide = await loadPyodide();

    // exec.pyの内容を読み込む
    const execPyCode = await fetch('exec.py').then(response => response.text());

    // 初期設定のためにJSONファイルを読み込む
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const initialCode = data.code;
            editor.setValue(initialCode);

            // 初回実行
            runPythonCode(initialCode);
        });

    // 「Run」ボタンのクリックイベントをリスン
    document.getElementById('runBtn').addEventListener('click', async () => {
        const code = editor.getValue();
        runPythonCode(code);
    });

    // 「Download」ボタンのクリックイベントをリスン
    document.getElementById('downloadBtn').addEventListener('click', () => {
        const objectOutputElement = document.getElementById('objectOutput').textContent;
        downloadJSON(objectOutputElement, 'objectOutput.json');
    });

    // 「Copy」ボタンのクリックイベントをリスン
    document.getElementById('copyBtn').addEventListener('click', () => {
        const code = editor.getValue();
        copyToClipboard(code);
    });

    // Pythonコードを実行して出力をキャプチャ
    async function runPythonCode(code) {
        const outputElement = document.getElementById('output');
        const objectOutputElement = document.getElementById('objectOutput');
        outputElement.textContent = '';
        objectOutputElement.textContent = '';

        try {
            // Pythonの実行結果を取得
            const { consoleOutput, objectOutputs } = await capturePythonOutput(code);
            outputElement.textContent = consoleOutput;
            objectOutputElement.textContent = JSON.stringify(objectOutputs, null, 2);
        } catch (error) {
            outputElement.textContent = `Error: ${error.message}`;
            objectOutputElement.textContent = `Error: ${error.message}`;
        }
    }

    // Pythonの標準出力をキャプチャ
    async function capturePythonOutput(userCode) {
        let consoleOutput = '';
        let objectOutputs = [];

        // 標準出力をキャプチャするためのPythonコード
        const fullCode = `
${execPyCode}

# exec.py で定義された execute_code 関数を呼び出して結果を取得
result = execute_code("""${escapeString(userCode)}""")
result
        `;

        try {
            // Pythonコードを実行し、結果を取得
            const result = await pyodide.runPythonAsync(fullCode);
            const parsedResult = JSON.parse(result); // 結果をJSONとして解析
            consoleOutput = parsedResult.console_output; // コンソール出力を取得
            objectOutputs = parsedResult.object_outputs; // オブジェクト出力を取得
        } catch (error) {
            consoleOutput = `Error: ${error.message}`; // エラー時のメッセージを設定
            objectOutputs = [{ result: 'error', message: error.message }]; // エラーオブジェクトを設定
        }

        return { consoleOutput, objectOutputs }; // 出力を返す
    }

    // 文字列をエスケープして安全にする
    function escapeString(str) {
        return str.replace(/(["\\])/g, '\\$1');
    }

    // JSONファイルをダウンロード
    function downloadJSON(jsonData, filename) {
        const blob = new Blob([jsonData], { type: 'application/json' }); // JSONデータをBlobに変換
        const url = URL.createObjectURL(blob); // Blob URLを生成
        const a = document.createElement('a'); // <a>要素を生成
        a.href = url; // URLを設定
        a.download = filename; // ファイル名を設定
        a.click(); // ダウンロードをトリガー
        URL.revokeObjectURL(url); // URLを解放
    }

    // テキストをクリップボードにコピー
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea'); // <textarea>要素を生成
        textarea.value = text; // テキストを設定
        document.body.appendChild(textarea); // <textarea>要素をDOMに追加
        textarea.select(); // テキストを選択
        document.execCommand('copy'); // クリップボードにコピー
        document.body.removeChild(textarea); // <textarea>要素を削除
        alert('Code copied to clipboard!'); // アラートを表示
    }
});

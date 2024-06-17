import sys
from io import StringIO
import json

def execute_code(user_code):
    output_capture = StringIO()
    sys.stdout = output_capture
    
    results = []
    try:
        # グローバル変数として実行するための辞書を準備
        local_vars = {}
        exec(user_code, {}, local_vars)

        # 標準出力を元に戻す
        sys.stdout = sys.__stdout__
        console_output = output_capture.getvalue()

        # 各行の評価結果を収集
        for line_number, line in enumerate(user_code.split('\n'), 1):
            try:
                if line.strip():  # 空行を除外
                    result = eval(line, {}, local_vars)
                    if result is not None:  # Noneの結果は除外
                        results.append({
                            'line': line_number,
                            'expression': line.strip(),
                            'type': str(type(result)),
                            'value': result
                        })
            except:
                continue  # 評価に失敗した行は無視

    except Exception as e:
        results.append({'error': str(e)})

    return json.dumps({'console_output': console_output, 'object_outputs': results})

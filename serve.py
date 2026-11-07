#!/usr/bin/env python3
"""
Локальный сервер для просмотра сайта.

Запуск:   python3 serve.py        (потом откройте http://localhost:8000)
Другой порт:   python3 serve.py 8080

Почему не `python3 -m http.server`: он работает, но у него очередь входящих соединений
всего 5 и на каждый файл открывается новое соединение. Когда браузер просит страницу,
он запрашивает сразу ~25 файлов (стили, скрипты, шрифты, данные). Часть запросов
иногда обрывается, и страница рисуется без шрифтов или стилей. Здесь очередь
большая и соединения переиспользуются, так что такого не бывает.

Заголовок Cache-Control: no-cache значит «спрашивать у сервера, не изменился ли файл».
Правки в коде видны сразу после обновления страницы, а неизменённые файлы отдаются
коротким ответом 304 без пересылки.
"""
import sys
import http.server


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"  # соединение живёт дольше одного файла

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # без шума в терминале


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256   # стандартные 5 переполняются при открытии страницы
    daemon_threads = True


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    with Server(("", port), Handler) as srv:
        print(f"PRYSMERK: http://localhost:{port}  (остановить: Ctrl+C)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nОстановлено")

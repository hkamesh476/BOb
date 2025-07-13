import subprocess
import sys
import os
import time


def start_backend():
    print('Starting Node.js backend...')
    backend_dir = os.path.join(os.getcwd(), 'backend')
    return subprocess.Popen(['npm', 'start'], cwd=backend_dir, shell=True)


def start_flask():
    print('Starting Flask frontend...')
    flask_dir = os.path.join(os.getcwd(), 'flask_frontend')
    return subprocess.Popen([sys.executable, 'app.py'], cwd=flask_dir, shell=True)


def main():
    backend_proc = start_backend()
    flask_proc = start_flask()
    print('\nAll services started. Press Ctrl+C to stop everything.')
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('Stopping all services...')
        for proc in [backend_proc, flask_proc]:
            if proc:
                proc.terminate()
        print('All services stopped.')


if __name__ == '__main__':
    main()

@echo off
echo Starting Flask server for your personal website...
cd python
pip install -r ..\requirements.txt
set FLASK_APP=server.py
set FLASK_ENV=development
set FLASK_DEBUG=1
python -m flask run --port=5000
"""Downloads the FBref Big 5 season tables (worldfootballR_data release) and converts them to pandas pickles."""
import os, urllib.request
import rds
BASE = 'https://github.com/JaseZiv/worldfootballR_data/releases/download/fb_big5_advanced_season_stats/'
os.makedirs('data', exist_ok=True)
for t in ['standard', 'shooting', 'possession']:
    f = f'data/big5_player_{t}.rds'
    if not os.path.exists(f):
        urllib.request.urlretrieve(BASE + f'big5_player_{t}.rds', f)
    rds.read_rds(f).to_pickle(f'data/{t}.pkl')
    print('ok', t)

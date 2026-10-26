import urllib.request, re

url = 'https://www.youtube.com/watch?v=mDhpMX4EeY8'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        m = re.search(r'"approxDurationMs":"(\d+)"', html)
        if m:
            ms = int(m.group(1))
            sec = ms // 1000
            print(f'Duration: {sec}s ({sec//60}:{sec%60:02d})')
        m2 = re.search(r'"lengthSeconds":"(\d+)"', html)
        if m2:
            sec = int(m2.group(1))
            print(f'LengthSeconds: {sec}s ({sec//60}:{sec%60:02d})')
except Exception as e:
    print('Err:', e)


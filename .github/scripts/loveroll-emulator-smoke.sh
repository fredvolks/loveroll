#!/usr/bin/env bash
# Single shell invocation: android-emulator-runner executes each YAML script line
# separately and cannot handle an inline multi-line for/if/done block.
set -euo pipefail

mkdir -p qa
# Changing navigation mode restarts System UI. Its accessibility root is
# temporarily null; retry the capture, then keep every app assertion strict.
capture_ui(){
  local name="$1"
  for capture_attempt in $(seq 1 6); do
    adb shell rm -f "/sdcard/$name.xml"
    adb shell uiautomator dump "/sdcard/$name.xml" || true
    if adb pull "/sdcard/$name.xml" "qa/$name.xml"; then return 0; fi
    sleep 2
  done
  return 1
}
adb logcat -c
adb logcat -v brief -s AndroidRuntime:E > qa/runtime-live.txt &
logcat_pid=$!
adb logcat -v threadtime > qa/device-log.txt &
device_log_pid=$!
# Preserve emulator/host evidence even if adb disconnects.
trap 'kill "$logcat_pid" "$device_log_pid" 2>/dev/null || true; adb shell cmd connectivity airplane-mode disable >/dev/null 2>&1 || true; free -m > qa/host-memory.txt; df -h > qa/host-disk.txt' EXIT
# Same 412dp-wide S25 proportions, FHD pixel buffers for stable CI software rendering.
adb shell wm size 1080x2340
adb shell wm density 420
adb install -r app/build/outputs/apk/debug/app-debug.apk
# Test the native failure view on an isolated fresh emulator, without user accounts.
adb shell cmd wifi status > qa/wifi-before-airplane.txt
adb shell cmd connectivity airplane-mode enable
adb shell am start -n ca.desadeux.jeu/.ConnectedLoveRollActivity
sleep 20
capture_ui loveroll-network-error
adb exec-out screencap -p > qa/loveroll-network-error.png
python3 - <<'PY_NATIVE'
import xml.etree.ElementTree as ET
root=ET.parse('qa/loveroll-network-error.xml').getroot()
buttons=[n for n in root.iter('node') if n.get('text')=='Réessayer']
assert len(buttons)==1,'Native network failure must provide one retry, not an endless heart'
import re
x1,y1,x2,y2=map(int,re.findall(r'\d+',buttons[0].get('bounds')))
open('qa/retry-coordinate.txt','w').write(str((x1+x2)//2)+' '+str((y1+y2)//2)+'\n')
print('LOVEROLL_NATIVE_NETWORK_ERROR_OK retry is visible')
PY_NATIVE
adb shell cmd connectivity airplane-mode disable
adb shell svc wifi enable
adb shell svc data enable
adb shell cmd wifi connect-network AndroidWifi open
# Turning airplane mode off does not guarantee Wi-Fi has reassociated yet.
# Wait for association AND DHCP before using the app's retry button.
for attempt in $(seq 1 25); do
  adb shell cmd wifi status > qa/wifi-after-airplane.txt
  adb shell ip -4 addr show wlan0 > qa/wifi-address.txt
  if grep -q 'Wifi is connected' qa/wifi-after-airplane.txt && grep -q 'inet ' qa/wifi-address.txt; then break; fi
  sleep 1
done
grep 'Wifi is connected' qa/wifi-after-airplane.txt
grep 'inet ' qa/wifi-address.txt
sleep 3
read -r retry_x retry_y < qa/retry-coordinate.txt
adb shell input tap "$retry_x" "$retry_y"
sleep 20
capture_ui loveroll-after-retry
python3 - <<'PY_NATIVE'
import xml.etree.ElementTree as ET
root=ET.parse('qa/loveroll-after-retry.xml').getroot()
assert not any(n.get('text')=='Réessayer' for n in root.iter('node')),'Retry returned to native error'
assert not any(n.get('content-desc')=='Chargement de votre espace…' for n in root.iter('node')),'Retry stayed on the loading view'
assert any('WebView' in n.get('class','') for n in root.iter('node')),'Retry did not reach the real WebView'
import re
web=next(n for n in root.iter('node') if n.get('class')=='android.webkit.WebView')
_,top,_,bottom=map(int,re.findall(r'\d+',web.get('bounds')))
assert 0<top<bottom<2340,('System bars overlap the WebView',top,bottom)
print('LOVEROLL_NATIVE_RETRY_OK no native error overlay remains')
PY_NATIVE
# Deliberately hold the HTML loader AFTER onPageFinished in the actual WebView,
# then reveal its real destination. The native composition must own that whole
# interval; a second HTML splash is never a valid destination.
node .github/scripts/loveroll-startup-handoff.cjs
adb shell am force-stop ca.desadeux.jeu
# Non-blocking launch: am start -W may time out waiting for remote WebView.
adb shell am start -n ca.desadeux.jeu/.ConnectedLoveRollActivity
sleep 10

for attempt in 1 2 3; do
  if adb exec-out screencap -p > qa/loveroll-shared-s25-android.png; then
    if test "$(stat -c%s qa/loveroll-shared-s25-android.png)" -gt 15000; then
      break
    fi
  fi
  sleep 3
done
test -s qa/loveroll-shared-s25-android.png
test "$(stat -c%s qa/loveroll-shared-s25-android.png)" -gt 15000

adb shell dumpsys activity activities > qa/activities.txt
grep 'ca.desadeux.jeu/.ConnectedLoveRollActivity' qa/activities.txt || grep 'ConnectedLoveRollActivity' qa/activities.txt
# The user uses Android's three navigation buttons. Check those insets too.
adb shell cmd overlay enable-exclusive --user 0 --category com.android.internal.systemui.navbar.threebutton
sleep 6
capture_ui loveroll-three-buttons
adb exec-out screencap -p > qa/loveroll-three-buttons.png
python3 - <<'PY_BARS'
import xml.etree.ElementTree as ET,re
def bounds(path):
 root=ET.parse(path).getroot()
 web=next(n for n in root.iter('node') if n.get('class')=='android.webkit.WebView')
 return list(map(int,re.findall(r'\d+',web.get('bounds'))))
gesture=bounds('qa/loveroll-after-retry.xml');buttons=bounds('qa/loveroll-three-buttons.xml')
assert 0<buttons[1]<buttons[3]<2340,buttons
assert buttons[3]<gesture[3],('Three-button navigation must reserve its larger bottom inset',gesture,buttons)
print('LOVEROLL_NATIVE_SAFE_AREA_OK',gesture,buttons)
PY_BARS
# Open the actual account form and keyboard; do not submit or create an account.
adb shell am force-stop ca.desadeux.jeu
adb shell am start -n ca.desadeux.jeu/.ConnectedLoveRollActivity --es destination auth
for attempt in $(seq 1 10); do
  sleep 2
  capture_ui loveroll-account
  if python3 - <<'PY_INPUT'
import xml.etree.ElementTree as ET,re,json
root=ET.parse('qa/loveroll-account.xml').getroot()
fields=[n for n in root.iter('node') if n.get('class')=='android.widget.EditText']
if not fields:raise SystemExit(1)
x1,y1,x2,y2=map(int,re.findall(r'\d+',fields[0].get('bounds')))
open('qa/email-coordinate.txt','w').write(f'{(x1+x2)//2} {(y1+y2)//2}\n')
PY_INPUT
  then break; fi
done
read -r email_x email_y < qa/email-coordinate.txt
adb shell input tap "$email_x" "$email_y"
adb shell input text 'test@example.invalid'
sleep 3
capture_ui loveroll-keyboard
adb exec-out screencap -p > qa/loveroll-keyboard.png
python3 - <<'PY_KEYBOARD'
import xml.etree.ElementTree as ET,re
def webbottom(root):
 web=next(n for n in root.iter('node') if n.get('class')=='android.webkit.WebView')
 return int(re.findall(r'\d+',web.get('bounds'))[3])
before=ET.parse('qa/loveroll-account.xml').getroot();after=ET.parse('qa/loveroll-keyboard.xml').getroot()
assert webbottom(after)<webbottom(before)-150,('Keyboard must resize the real viewport',webbottom(before),webbottom(after))
assert any(n.get('text')=='test@example.invalid' for n in after.iter('node')),'Email field must stay editable with the keyboard open'
print('LOVEROLL_NATIVE_KEYBOARD_OK',webbottom(before),webbottom(after))
PY_KEYBOARD
# UIAutomator cannot inspect the WebView DOM reliably, so web Playwright CI
# checks exact HTML/dice placement separately.
adb logcat -d -v brief -s AndroidRuntime:E > qa/runtime_errors.txt || true
if grep -q 'FATAL EXCEPTION' qa/runtime_errors.txt; then
  cat qa/runtime_errors.txt
  exit 1
fi
echo "LOVEROLL_S25_EMULATOR_OK screenshot=$(stat -c%s qa/loveroll-shared-s25-android.png)"

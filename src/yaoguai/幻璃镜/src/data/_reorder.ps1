$filePath = 'd:/BaiduNetdiskDownload/tavern_helper_template-main/src/yaoguai/幻璃镜/src/data/locationHierarchy.ts'
$lines = Get-Content $filePath -Encoding UTF8

# 0-indexed:
# Line 38 (0-idx) = "export const REALM_REGIONS: RealmRegion[] = ["  (line 39 1-idx)
# Lines 39-41 (0-idx) = 皇城注释 (lines 40-42 1-idx)  
# Wait, let me re-check. 1-indexed:
# Line 38: export const REALM_REGIONS...
# Line 39: // ═...
# Line 40: //  皇城
# Line 41: // ═...
# Line 42: {
# So 0-indexed: 37 = export, 38-40 = comments, 41 = {

# Far end:
# Line 5357 (1-idx) = "  },"  (远征结束)  -> 0-idx 5356
# Line 5358 (1-idx) = "" (空行) -> 0-idx 5357
# Line 5359 (1-idx) = "  // ═..." (宫城注释) -> 0-idx 5358
# ...
# Line 6051 (1-idx) = "  }," (宫城结束) -> 0-idx 6050
# Line 6052 (1-idx) = "];" (数组结束) -> 0-idx 6051

# Strategy: 
# 1. Header: lines 0..37 (0-idx) = 1..38 (1-idx) = up to and including "export const REALM_REGIONS: RealmRegion[] = ["
# 2. Gongcheng block: lines 5358..6050 (0-idx) = 5359..6051 (1-idx) = 宫城注释+对象
# 3. Middle (皇城到远征): lines 38..5356 (0-idx) = 39..5357 (1-idx) 
# 4. Footer: lines 6051..end (0-idx) = 6052..end (1-idx) = "];" and beyond

$headerLines = $lines[0..37]
$gongchengLines = $lines[5358..6050]
$middleLines = $lines[38..5356]
$footerLines = $lines[6051..($lines.Length - 1)]

# Assemble:
# header + gongcheng + blank line + middle + footer
$result = @()
$result += $headerLines
$result += $gongchengLines
$result += ""
$result += $middleLines
$result += $footerLines

$resultText = $result -join "`n"
[IO.File]::WriteAllText($filePath, $resultText, [Text.Encoding]::UTF8)
$newCount = (Get-Content $filePath -Encoding UTF8).Length
Write-Host "Done. New line count: $newCount"

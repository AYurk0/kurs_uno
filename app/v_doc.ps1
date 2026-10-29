# ============================================================================
#  Перевод отчёта в двоичный .doc (Word 97–2003) через установленный Word.
#  ---------------------------------------------------------------------------
#  Кнопка «Полный отчёт в Word (.doc)» сохраняет веб-архив Word с расширением
#  .doc — Word открывает его как обычный документ. Этот скрипт открывает файл
#  в Word, обновляет оглавление и номера страниц и пересохраняет его как
#  настоящий .doc (формат Word 97–2003). Рядом можно получить PDF (-Pdf).
#
#  Запуск (PowerShell):
#    powershell -ExecutionPolicy Bypass -File app\v_doc.ps1 "C:\...\Отчет_Вариант7_группа1.doc"
#    powershell -ExecutionPolicy Bypass -File app\v_doc.ps1 файл.doc -Out итог.doc -Pdf
# ============================================================================
param(
  [Parameter(Mandatory=$true,Position=0)][string]$In,
  [string]$Out,
  [switch]$Pdf
)
$ErrorActionPreference = "Stop"
$In = (Resolve-Path $In).Path
if (-not $Out) { $Out = $In }                       # по умолчанию — на месте
$Out = [System.IO.Path]::GetFullPath($Out)
$tmp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "kp_" + [guid]::NewGuid().ToString("N") + ".doc")
Copy-Item $In $tmp                                   # Word не может сохранить файл поверх открытого

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open($tmp, $false, $true)   # ConfirmConversions=false, ReadOnly=true
  $doc.ActiveWindow.View.Type = 3                    # wdPrintView — разметка страницы
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  $doc.Fields.Update() | Out-Null
  foreach ($s in $doc.Sections) { foreach ($f in $s.Footers) { $f.Range.Fields.Update() | Out-Null } }
  $doc.SaveAs2([ref]$Out, [ref]0)                    # 0 = wdFormatDocument97 (двоичный .doc)
  if ($Pdf) { $doc.SaveAs2([ref]([System.IO.Path]::ChangeExtension($Out, ".pdf")), [ref]17) }  # 17 = wdFormatPDF
  "страниц: " + $doc.ComputeStatistics(2) + "; рисунков: " + $doc.InlineShapes.Count + "; таблиц: " + $doc.Tables.Count
  $doc.Close([ref]0)
  "сохранено: $Out"
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  Remove-Item $tmp -ErrorAction SilentlyContinue
}

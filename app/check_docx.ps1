# Verifies the generated .docx in Word: pages, images, tables, image size.
# ASCII only: PowerShell 5 reads .ps1 without BOM as ANSI and breaks on UTF-8.
$file = (Get-ChildItem -Path $PSScriptRoot -Filter '*.docx' | Select-Object -First 1).FullName
Write-Output ("file: " + $file)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open($file, $false, $true)
$doc.Repaginate()
Write-Output ("pages: "  + $doc.ComputeStatistics(2))
Write-Output ("images: " + $doc.InlineShapes.Count)
Write-Output ("tables: " + $doc.Tables.Count)
if ($doc.InlineShapes.Count -gt 0) {
  $s1 = $doc.InlineShapes.Item(1)
  Write-Output ("image1 cm: {0:N1} x {1:N1}" -f ($s1.Width / 28.3465), ($s1.Height / 28.3465))
}
$doc.Close(0)
$word.Quit()

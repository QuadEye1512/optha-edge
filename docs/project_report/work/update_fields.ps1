param([string]$InputDoc,[string]$AuditPath)
$ErrorActionPreference='Stop'
$word=New-Object -ComObject Word.Application
$word.Visible=$false
$word.DisplayAlerts=0
try {
  $doc=$word.Documents.Open($InputDoc,$false,$false)
  try {
    $doc.Fields.Update() | Out-Null
    foreach($toc in $doc.TablesOfContents){$toc.Update()}
    $doc.Repaginate()
    foreach($toc in $doc.TablesOfContents){$toc.UpdatePageNumbers()}
    foreach($sec in $doc.Sections){foreach($foot in $sec.Footers){$foot.Range.Fields.Update() | Out-Null}}
    $doc.Save()
    $headings=@()
    foreach($para in $doc.Paragraphs){
      $style=$para.Style.NameLocal
      if($style -eq 'Heading 1' -or $style -eq 'Heading 2'){
        $headings+=@{text=$para.Range.Text.Trim();style=$style;page=$para.Range.Information(3);printedPage=$para.Range.Information(1)}
      }
    }
    @{pages=$doc.ComputeStatistics(2);words=$doc.ComputeStatistics(0);tocCount=$doc.TablesOfContents.Count;headings=$headings} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $AuditPath -Encoding UTF8
    Write-Output ('Updated fields and saved report. Pages: '+$doc.ComputeStatistics(2))
  } finally {$doc.Close(0)}
} finally {$word.Quit()}

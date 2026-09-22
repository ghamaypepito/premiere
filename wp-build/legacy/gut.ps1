Add-Type -AssemblyName System.Drawing
foreach($f in 'about-1-2.jpg','about-2-2.jpg'){
 $b=[Drawing.Bitmap]::FromFile((Resolve-Path $f))
 # rows that are near-white across the left 60% band
 $rows=@(); for($y=0;$y -lt $b.Height;$y++){ $w=0; for($x=20;$x -lt 640;$x+=8){ $p=$b.GetPixel($x,$y); if($p.R -gt 235 -and $p.G -gt 235 -and $p.B -gt 235){$w++} }; if($w -gt 72){$rows+=$y} }
 $cols=@(); for($x=0;$x -lt $b.Width;$x++){ $w=0; for($y=450;$y -lt 800;$y+=6){ $p=$b.GetPixel($x,$y); if($p.R -gt 235 -and $p.G -gt 235 -and $p.B -gt 235){$w++} }; if($w -gt 52){$cols+=$x} }
 Write-Output "$f rows: $($rows -join ',')"
 Write-Output "$f cols: $($cols -join ',')"
 $b.Dispose()
}

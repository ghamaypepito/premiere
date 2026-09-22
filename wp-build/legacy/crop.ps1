Add-Type -AssemblyName System.Drawing
$jobs=@(
 @('about-1-2.jpg','premier-team-culture-of-engagement-and-trust',4,4,1072,512),
 @('about-1-2.jpg','premier-hr-ignite-culture-of-values-session',4,530,666,952),
 @('about-1-2.jpg','premier-family-business-consulting-cebu-office',4,970,666,1345),
 @('about-2-2.jpg','family-enterprise-roadshow-bohol-2026-participants',4,6,1075,430),
 @('about-2-2.jpg','jon-ramos-family-enterprise-roadshow-bohol-2026',4,440,644,835),
 @('about-2-2.jpg','family-enterprise-roadshow-bohol-2026-session',657,440,1056,788),
 @('about-2-2.jpg','jon-ramos-speaking-family-enterprise-roadshow',4,846,410,1104)
)
$enc=[Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|?{$_.MimeType -eq 'image/jpeg'}; $ep=New-Object Drawing.Imaging.EncoderParameters 1; $ep.Param[0]=[Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality, [long]88)
foreach($j in $jobs){ $src=[Drawing.Bitmap]::FromFile((Resolve-Path $j[0])); $r=New-Object Drawing.Rectangle $j[2],$j[3],($j[4]-$j[2]),($j[5]-$j[3]); $c=New-Object Drawing.Bitmap $r.Width,$r.Height; $g=[Drawing.Graphics]::FromImage($c); $g.InterpolationMode='HighQualityBicubic'; $g.DrawImage($src,(New-Object Drawing.Rectangle 0,0,$r.Width,$r.Height),$r,[Drawing.GraphicsUnit]::Pixel); $g.Dispose(); $out=[IO.Path]::Combine((Get-Location).Path,'crops',$j[1]+'.jpg'); $c.Save($out,$enc,$ep); Write-Output "$($j[1]) $($c.Width)x$($c.Height)"; $c.Dispose(); $src.Dispose() }
function Resize($in,$outName,$maxW){ $src=[Drawing.Bitmap]::FromFile((Resolve-Path $in)); $w=[Math]::Min($maxW,$src.Width); $h=[int]($src.Height*$w/$src.Width); $c=New-Object Drawing.Bitmap $w,$h; $g=[Drawing.Graphics]::FromImage($c); $g.InterpolationMode='HighQualityBicubic'; $g.DrawImage($src,0,0,$w,$h); $g.Dispose(); $c.Save([IO.Path]::Combine((Get-Location).Path,'crops',$outName+'.jpg'),$enc,$ep); Write-Output "$outName ${w}x$h"; $c.Dispose(); $src.Dispose() }
Resize 'ChatGPT-Image-Jun-29-2026-02_33_18-PM.png' 'jon-ramos-legacy-in-action-book' 1448
Resize 'DSC_7847.jpg' 'legacy-in-action-book-by-jon-ramos' 1600

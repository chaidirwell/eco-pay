Add-Type -AssemblyName System.Drawing
$imgPath = "d:\eco-pay-main\eco-pay-main\assets\img\ecopay_logo.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$bmp = New-Object System.Drawing.Bitmap($img)
$img.Dispose()

# Make pure white transparent
$bmp.MakeTransparent([System.Drawing.Color]::White)

$bmp.Save($imgPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Success"

param(
 [Parameter(Mandatory=$true)][string]$Sdk,
 [Parameter(Mandatory=$true)][string]$JavaHome,
 [Parameter(Mandatory=$true)][string]$Keystore,
 [Parameter(Mandatory=$true)][string]$PasswordFile,
 [string]$Python='python',
 [string]$Gradle='',
 [string]$GradleUserHome='',
 [switch]$Offline,
 [string]$Output='ratib.apk'
)
$ErrorActionPreference='Stop'
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$build=Join-Path $projectRoot 'build/delivery'
New-Item -ItemType Directory -Force -Path $build | Out-Null
$env:JAVA_HOME=$JavaHome
$env:ANDROID_USER_HOME=Join-Path $build 'android-user'
if(!$GradleUserHome){$GradleUserHome=Join-Path $projectRoot '.gradle-user'}
$env:GRADLE_USER_HOME=$GradleUserHome
New-Item -ItemType Directory -Force -Path $env:ANDROID_USER_HOME | Out-Null
[IO.File]::WriteAllText((Join-Path $projectRoot 'local.properties'),'sdk.dir='+$Sdk.Replace('\','/'))
function Checked([string]$Executable,[string[]]$Arguments){ & $Executable @Arguments; if($LASTEXITCODE -ne 0){throw "Build step failed ($LASTEXITCODE)"} }
if(!$Gradle){$Gradle=Join-Path $projectRoot 'gradlew.bat'}
$gradleArgs=@('-p',$projectRoot,'--no-daemon','--console','plain','assembleRelease')
if($Offline){$gradleArgs+='--offline'}
Checked $Gradle $gradleArgs
$unsigned=Join-Path $build 'unsigned.apk'
Copy-Item -LiteralPath (Join-Path $projectRoot 'app/build/outputs/apk/release/app-release-unsigned.apk') -Destination $unsigned -Force
Checked $Python @((Join-Path $PSScriptRoot 'normalize-apk-assets.py'),$unsigned)
$tools=Join-Path $Sdk 'build-tools/36.0.0'
Checked (Join-Path $tools 'zipalign.exe') @('-f','-p','4',$unsigned,(Join-Path $build 'aligned.apk'))
Checked (Join-Path $JavaHome 'bin/java.exe') @('-jar',(Join-Path $tools 'lib/apksigner.jar'),'sign','--ks',$Keystore,'--ks-key-alias','ratib','--ks-pass',"file:$PasswordFile",'--out',$Output,(Join-Path $build 'aligned.apk'))
Checked (Join-Path $JavaHome 'bin/java.exe') @('-jar',(Join-Path $tools 'lib/apksigner.jar'),'verify','--verbose','--print-certs',$Output)
Checked $Python @((Join-Path $projectRoot 'tests/apk-integrity.py'),$Output)
Get-FileHash -LiteralPath $Output -Algorithm SHA256

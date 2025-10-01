# Windows Audio Device Control Script
# This script uses the AudioDeviceCmdlets module to control Windows audio devices

param(
    [Parameter(Mandatory=$false)]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$PlaybackDevice,

    [Parameter(Mandatory=$false)]
    [string]$RecordingDevice
)

# Check if AudioDeviceCmdlets module is installed
if (-not (Get-Module -ListAvailable -Name AudioDeviceCmdlets)) {
    Write-Output "MODULE_NOT_INSTALLED"
    exit 1
}

try {
    Import-Module AudioDeviceCmdlets -ErrorAction Stop
} catch {
    Write-Output "MODULE_IMPORT_FAILED: $($_.Exception.Message)"
    exit 1
}

function Get-AudioDevices {
    $playbackDevices = Get-AudioDevice -List | Where-Object { $_.Type -eq "Playback" } | Select-Object Index, Name, Default, ID
    $recordingDevices = Get-AudioDevice -List | Where-Object { $_.Type -eq "Recording" } | Select-Object Index, Name, Default, ID

    $result = @{
        playback = @()
        recording = @()
    }

    foreach ($device in $playbackDevices) {
        $result.playback += @{
            index = $device.Index
            name = $device.Name
            default = $device.Default
            id = $device.ID
        }
    }

    foreach ($device in $recordingDevices) {
        $result.recording += @{
            index = $device.Index
            name = $device.Name
            default = $device.Default
            id = $device.ID
        }
    }

    return $result | ConvertTo-Json -Depth 3
}

function Set-DefaultAudioDevices {
    param(
        [string]$Playback,
        [string]$Recording
    )

    try {
        if ($Playback) {
            # Try to set by name first
            $playbackDevice = Get-AudioDevice -List | Where-Object { $_.Type -eq "Playback" -and $_.Name -like "*$Playback*" } | Select-Object -First 1
            if ($playbackDevice) {
                Set-AudioDevice -Index $playbackDevice.Index
                Write-Output "Playback device set to: $($playbackDevice.Name)"
            } else {
                Write-Output "ERROR: Playback device not found: $Playback"
                return $false
            }
        }

        if ($Recording) {
            # Try to set by name first
            $recordingDevice = Get-AudioDevice -List | Where-Object { $_.Type -eq "Recording" -and $_.Name -like "*$Recording*" } | Select-Object -First 1
            if ($recordingDevice) {
                Set-AudioDevice -Index $recordingDevice.Index
                Write-Output "Recording device set to: $($recordingDevice.Name)"
            } else {
                Write-Output "ERROR: Recording device not found: $Recording"
                return $false
            }
        }

        return $true
    }
    catch {
        Write-Output "ERROR: $($_.Exception.Message)"
        return $false
    }
}

# Main logic
switch ($Action) {
    "check" {
        Write-Output "MODULE_INSTALLED"
    }
    "install" {
        try {
            Install-Module -Name AudioDeviceCmdlets -Force -Scope CurrentUser -ErrorAction Stop
            Write-Output "INSTALL_SUCCESS"
        } catch {
            Write-Output "INSTALL_FAILED: $($_.Exception.Message)"
            exit 1
        }
    }
    "list" {
        Get-AudioDevices
    }
    "set" {
        $result = Set-DefaultAudioDevices -Playback $PlaybackDevice -Recording $RecordingDevice
        if ($result) {
            Write-Output "SUCCESS"
        }
    }
    default {
        Write-Output "Invalid action. Use 'check', 'install', 'list' or 'set'"
    }
}

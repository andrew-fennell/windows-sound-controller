; Custom NSIS installer script for Windows Sound Controller

Var StartupCheckbox
Var StartupCheckboxState

!include nsDialogs.nsh

!macro customInit
  StrCpy $StartupCheckboxState ${BST_UNCHECKED}
!macroend

Function StartupCheckboxPage
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateLabel} 0 0 100% 12u "Additional Options:"
  Pop $0

  ${NSD_CreateCheckbox} 10u 20u 100% 12u "Run Windows Sound Controller on Windows startup"
  Pop $StartupCheckbox
  ${NSD_SetState} $StartupCheckbox $StartupCheckboxState

  nsDialogs::Show
FunctionEnd

Function StartupCheckboxPageLeave
  ${NSD_GetState} $StartupCheckbox $StartupCheckboxState
FunctionEnd

!macro customInstallMode
  !insertmacro MUI_PAGE_DIRECTORY
  Page custom StartupCheckboxPage StartupCheckboxPageLeave
!macroend

!macro customInstall
  ${If} $StartupCheckboxState == ${BST_CHECKED}
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WindowsSoundController" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  ${EndIf}
!macroend

!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "WindowsSoundController"
!macroend

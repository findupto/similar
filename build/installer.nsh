!include "LogicLib.nsh"

!macro customInit
  ; Electron stores POS local data under the user's %APPDATA% folder.
  ; Ask before an install/upgrade if an existing POS data directory is present.
  ${ifNot} ${isUpdated}
    IfFileExists "$APPDATA\MK Pizza & Ice Bar POS\*.*" found_old_data check_legacy_data
    check_legacy_data:
      IfFileExists "$APPDATA\mk-pizza-pos\*.*" found_old_data no_old_data
    found_old_data:
      MessageBox MB_ICONEXCLAMATION|MB_YESNO|MB_DEFBUTTON1 "Existing MK Pizza POS data was found on this computer.$\r$\n$\r$\nYES = Keep and use the old data.$\r$\nNO = Delete the old POS data and start with fresh new data.$\r$\n$\r$\nIf you choose NO, the old POS data will be permanently deleted." IDYES keep_old_data IDNO delete_old_data
    delete_old_data:
      ClearErrors
      RMDir /r "$APPDATA\MK Pizza & Ice Bar POS"
      RMDir /r "$APPDATA\mk-pizza-pos"
      IfErrors delete_failed delete_done
      delete_failed:
        MessageBox MB_ICONSTOP|MB_OK "The old POS data could not be completely deleted. Please close MK Pizza POS and run the installer again."
        Abort
      delete_done:
        Goto done_old_data
    keep_old_data:
      Goto done_old_data
    no_old_data:
    done_old_data:
  ${endIf}
!macroend

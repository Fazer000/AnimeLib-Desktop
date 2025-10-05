; Custom NSIS script for AnimeLib Desktop Beta installer
; Automatically adds app folder name to installation path

!define APP_DIR_NAME "AnimeLibDesktopBeta"

!macro customInit
  ; Устанавливаем путь по умолчанию для всех пользователей
  StrCpy $INSTDIR "$PROGRAMFILES\${APP_DIR_NAME}"
!macroend

!macro customInstall
  ; Код выполняется после установки
!macroend

!macro customUnInit
  ; Код для деинсталлятора
!macroend

!macro customHeader
  ; Дополнительные настройки
!macroend

!macro preInit
  ; Выполняется до инициализации
  SetRegView 64
!macroend

!macro customInstallMode
  ; Кастомная логика для выбора режима установки
  ; Если пользователь выбрал кастомный путь, добавляем имя папки
  ${If} $INSTDIR != "$PROGRAMFILES\${APP_DIR_NAME}"
    ${If} $INSTDIR != "$PROGRAMFILES64\${APP_DIR_NAME}"
      ; Проверяем, не заканчивается ли уже путь на имя папки
      StrLen $0 "\${APP_DIR_NAME}"
      StrLen $1 $INSTDIR
      IntOp $2 $1 - $0
      StrCpy $3 $INSTDIR $2
      StrCpy $4 $INSTDIR "" $2
      ${If} $4 != "\${APP_DIR_NAME}"
        StrCpy $INSTDIR "$INSTDIR\${APP_DIR_NAME}"
      ${EndIf}
    ${EndIf}
  ${EndIf}
!macroend

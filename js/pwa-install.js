
(function(){let promptEvent;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;});window.OmInstall={async prompt(){if(promptEvent){promptEvent.prompt();return await promptEvent.userChoice}return null}}})();

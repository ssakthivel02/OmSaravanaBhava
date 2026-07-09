// OmSaravanaBhava Batch 17 — reader utilities
(function(){
  window.OSBReader = {
    setReviewedBadge:function(selector,status){
      document.querySelectorAll(selector).forEach(el=>{el.textContent=status; el.setAttribute('data-review-status',status);});
    },
    copyCitation:function(text){
      navigator.clipboard && navigator.clipboard.writeText(text);
    }
  };
})();
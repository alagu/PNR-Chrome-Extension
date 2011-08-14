PNRStatus = {};
PNRStatus.sortInProgress = false;
(function(){

PNRStatus.ticketMarkup = '\
	<div class="status-item" id="${pnr_num}">\
	      <div class="fetching">\
	           Fetching status for PNR ${pnr_num}\
	      </div>\
        <div class="date-info">\
            <div class="date">\
                ${date} \
            </div>\
            <div class="year">\
                ${year}\
            </div>\
            <div class="weekday">\
                ${weekday}\
            </div>\
        </div>\
        <div class="ticket-status">\
            <div class="delete">x</div>\
            <div class="pnr-num">\
                PNR ${pnr_num}\
            </div>\
            <div class="start-destination">\
                ${source}  ${destination}\
            </div>\
            <div class="ticket-items">\
                <div class="fetching-pnr">\
        	           Fetching status \
        	      </div>\
                <ul class="ticket-item-list">\
                    <!--li class="cnf"><div class="ticket-status-text">S1</div><div class="ticket-status-num">31</div></li-->\
                    <li class="clrfix"></li>\
                </ul>\
                <div class="train-name-block">\
                    <div class="train-num">${train_num}</div> <div class="train-name">${train_name}</div>\
					          <div class="chart-status chart-status-not-prepared"><span class="chart-status-text">Chart not prepared</span></div>\
                </div>\
                <div style="clear:both;"></div>\
            </div>\
        </div>\
    </div>\
	 ';  
  
PNRStatus.getDateMarkup = function(timestamp)
{
	var dateTuple = PNRStatus.getDate(timestamp);
	returnhtml  =  '     <div class="travel-date-date">' + dateTuple[0] + '</div>';
    returnhtml += '     <div class="travel-date-month">' + dateTuple[1]+ '</div>';	
	return returnhtml;
}

PNRStatus.getDate = function(timestamp) 
{
  var d = new Date(timestamp * 1000);
  var monthList = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var dayList   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var date = d.getDate();
  var day  = dayList[d.getDay()];
  var month = monthList[d.getMonth()];
  var year = d.getFullYear();

  return [date,month,year,day];
}

PNRStatus.setTimedout = function(pnr_num)
{
  var node = $('#' + pnr_num);
  node.find('.fetching-pnr').html(' Indian railways is timing out :( ');
  node.find('.fetching-pnr').css('background', 'none'); 
}

PNRStatus.callback = function(data)
{
  var return_obj = eval('(' + data + ')');
  if(return_obj.status == 'OK')
  {	
    PNRStatus.updateTicketItem(return_obj.data.pnr_number, return_obj.data);
  }
  else if (return_obj.status == 'INVALID')
  {
    PNRStatus.deletePNR(return_obj.data.pnr_number);
  }
  else if (return_obj.status == 'TIMEOUT')
  {
    PNRStatus.setTimedout(return_obj.data.pnr_number);
  }
}


PNRStatus.updateTicketItem = function(pnr_num,data,update)
{
  if(data) {
    
    var ticketNode = $('#' + pnr_num);
    var date = PNRStatus.getDate(data.travel_date.timestamp);
    ticketNode.attr('date',data.travel_date.timestamp);
    ticketNode.find('.date').html(date[0] + ' ' + date[1]);
    ticketNode.find('.year').html(date[2]);
    ticketNode.find('.weekday').html(date[3]);
    ticketNode.find('.ticket-status .start-destination').html(data.board.name + ' - ' + data.alight.name);
    ticketNode.find('.train-name-block  .train-num').html(data.train_number);
    ticketNode.find('.train-name-block .train-name').html(data.train_name);
    ticketNode.find('.fetching').hide();
    ticketNode.find('.ticket-status').show();
    ticketNode.find('.date-info').show();
    
    if(data.hasOwnProperty('passenger'))
    {
      ticketNode.find('.fetching-pnr').hide();
      for(var i=0;i<data.passenger.length;i++)
      {
        var status = data.passenger[i];
        var css    = PNRStatus.getStatusClass(status);
        var number = '?';
        var text   = 'WL';
        if (css == 'wl'){
          number = status.status.match(/(\d+)/)[0];
          text   = 'WL';
        }
        else if (css == 'rac'){
          text   = 'RAC';
          number = status.status.match(/(\d+)/)[0]
        }
        else 
        {
          var splits = status.seat_number.split(',')
          number = splits[1];
          text   = splits[0];
        }
        
        
        var markup = '<li class="${css}"><div class="ticket-status-text">${status}</div><div class="ticket-status-num">${number}</div></li>';
        var node   = $.tmpl(markup,{'css':css,'status':text,'number':number});
        ticketNode.find('.ticket-item-list').append(node);
      }
      
      if(data.chart_prepared)
      {
        ticketNode.find('.chart-status').removeClass('chart-status-not-prepared');
        ticketNode.find('.chart-status').addClass('chart-status-prepared');
        ticketNode.find('.chart-status span').html('Chart Prepared');
      }
      
      delete data.passenger;
      var json = $.toJSON(data);
      localStorage.setItem(pnr_num,json);
    }
    
    PNRStatus.sort();
  }
}

PNRStatus.sort = function(pnr_num){
  if(!PNRStatus.sortInProgress) {
    PNRStatus.sortInProgress = true;
    var allNodes = $('.status-item');
    var node_list = [];
    for(var i=0;i<allNodes.length;i++)
    {
      var node_info = {'pnr':$(allNodes[i]).attr('id'), 'date':$(allNodes[i]).attr('date')};
      node_list.push(node_info);
    }
    
    //Sort them. (Bubble)
    
    for(var i=0;i<node_list.length;i++)
    {
      for(var j=0;j<node_list.length-1;j++)
      {
        if(node_list[j].date > node_list[j+1].date)
        {
          //Swap
          var tmp = node_list[j];
          node_list[j] = node_list[j+1];
          node_list[j+1] = tmp;
        }
      }
    }
    
    for(var i=node_list.length-1;i>=1;i--)
    {
      var smallerdate = node_list[i-1];
      var largerdate  = node_list[i];
      
      $('#' + smallerdate.pnr).insertBefore('#'+largerdate.pnr);
    }
    PNRStatus.sortInProgress = false;
  }
}

PNRStatus.getPNRStatus = function(pnrInteger)
{
  var url = 'http://pnrapi.alagu.net/api/v1.0/pnr/' + pnrInteger;// + '?jsonp=pnrInteger';
  var chrome_getJSON = function(url, callback) {
        chrome.extension.sendRequest({action:'getJSON',url:url}, callback);
  }
  chrome_getJSON(url, PNRStatus.callback);
}

PNRStatus.init = function(){
  $('#add-button').click(PNRStatus.addPNR);
  PNRStatus.populatePNR();
  PNRStatus.setDisplays();
  PNRStatus.fetchAll();
}

PNRStatus.setDisplays = function()
{ 
	
	for (var i=0;i<PNRStatus.pnrnum.length;i++){
	  var node = 	$.tmpl(PNRStatus.ticketMarkup,{'pnr_num':PNRStatus.pnrnum[i]});
	  $('#status-items-block').append(node);
	}
	$('.ticket-status').hide();
	$('.date-info').hide();
	$('.delete').click(PNRStatus.deletePNRCB);
	
	for (var i=0;i<PNRStatus.pnrnum.length;i++){
	  if(localStorage.getItem(PNRStatus.pnrnum[i]))
	  {
	    var data = $.parseJSON(localStorage.getItem(PNRStatus.pnrnum[i]));
	    PNRStatus.updateTicketItem(PNRStatus.pnrnum[i],data);
	  }
	}
		
	$('#give-feedback').click(function(e){
		chrome.tabs.create({'url':'https://chrome.google.com/webstore/detail/almdggoleggeecgelbjekpmefpohdjck'});
	})
}

PNRStatus.deletePNRCB = function(ev)
{
   var pnrnum = this.parentNode.parentNode.id;
   PNRStatus.deletePNR(pnrnum);
}


PNRStatus.deletePNR = function(pnrnum){
 $('#' + pnrnum).remove();
 if(PNRStatus.pnrnum.indexOf(pnrnum) >= 0)
 {
   PNRStatus.deleteFromLocalStorage(pnrnum);
 }

 PNRStatus.trackEvent('deletePNR');
}

PNRStatus.deleteFromLocalStorage = function(num)
{
  if(num){
    PNRStatus.populatePNR();
    if(PNRStatus.pnrnum.indexOf(num) != -1)
    {
      PNRStatus.pnrnum.splice(PNRStatus.pnrnum.indexOf(num),1);
    }
    localStorage['pnrnum'] = PNRStatus.pnrnum.join(',');
  }
}

PNRStatus.addPNR = function(ev)
{
 var add_pnr_val = $('#add-pnr').val();
 var num = add_pnr_val.match(/(\d+)/)[0];
 
 $('#add-pnr').hide();
 $('#add-button').hide();
 
 $('.add-response').show();
 

 var addsuccess = false;
 if(num.length != 10) 
 {
    $('.add-response').html(' Invalid PNR number');
    $('.add-response').addClass('error');
     PNRStatus.resetAddPNRAfter(2);
 }
 else if(PNRStatus.pnrnum.indexOf(num) != -1)
 {
   $('.add-response').html(' PNR Number already being tracked');
   $('.add-response').addClass('error');
   PNRStatus.resetAddPNRAfter(2);
 }
 else
 {
   $('.add-response').html(' Alright, I\'m tracking it');
   $('.add-response').addClass('success');
   PNRStatus.pnrnum.push(num);
   addsuccess = true;
   PNRStatus.resetAddPNRAfter(2);
 }


 if(addsuccess)
 {
   PNRStatus.addPNRToDisplay(num);
 }
 
 $('#add-pnr').val('');
 
 localStorage['pnrnum'] = PNRStatus.pnrnum.join(',');
 PNRStatus.trackEvent('addPNR');
}


PNRStatus.addPNRToDisplay = function(num)
{
   var node = 	$.tmpl(PNRStatus.ticketMarkup,{'pnr_num':num});
   $('#status-items-block').append(node);
   node.find('.ticket-status').hide();
 	 node.find('.date-info').hide();
 	 node.find('.delete').click(PNRStatus.deletePNRCB);
 	 PNRStatus.getPNRStatus(num);
}

PNRStatus.resetAddPNRAfter  = function(time)
{
  setTimeout(function(){
    $('#add-pnr').show();
    $('#add-button').show();
    $('#add-pnr').val('');
    $('.add-response').html('Adding');
    $('.add-response').removeClass('error');
    $('.add-response').removeClass('success');
    $('.add-response').hide();
  },time*1000)
}

PNRStatus.pnrnum = [];

PNRStatus.populatePNR = function()
{
  var pnrString = localStorage['pnrnum'];
  if(!pnrString || pnrString.length == 0)
  {
    PNRStatus.pnrnum = [];
  }
  else
  {
    PNRStatus.pnrnum = pnrString.split(',');
  }
}


PNRStatus.fetchAll = function()
{
  for(var i=0;i<PNRStatus.pnrnum.length;i++)
  {
    PNRStatus.getPNRStatus(PNRStatus.pnrnum[i]);
  }
}

PNRStatus.getStatusClass = function(status)
{
	 if( status.status.indexOf('RAC') != -1
	       ||status.seat_number.indexOf('RAC') != -1
         )
	{
		return 'rac';
	}
	else if(status.status.indexOf('W/L') != -1
	  ||status.seat_number.indexOf('W/L') != -1)
	{
		return 'wl';
	}
	else
	{
		return 'cnf';
	}
}

PNRStatus.trackEvent = function(event)
{
  chrome.extension.sendRequest({action:'track',event:event});
}

PNRStatus.init();
})();

console.log("Loaded AliExpress Addon");

function getTrackingID(order_id) {
  return new Promise(function (resolve, reject) {
    var ajaxRequest = new XMLHttpRequest();
    ajaxRequest.onreadystatechange = function () {

      if (ajaxRequest.readyState == 4) {
        if (ajaxRequest.status == 200) {
          var response_string = ajaxRequest.responseText;
          //console.log(response_string);
          response_string = response_string.substr(6, response_string.length - 6 - 1);
          //console.log(response_string);
          var response = JSON.parse(response_string);
          //console.log(response);
          //console.log(response.tracking[0].mailNo);
          response.order_id = order_id;
          resolve(response);
        }
        else {
          reject("Status error: " + ajaxRequest.status);
        }
      }
    };
    ajaxRequest.open('GET', 'https://ilogisticsaddress.aliexpress.com/ajax_logistics_track.htm?orderId=' + order_id);
    ajaxRequest.send();
  });
}

function injectTrackingOverviewinPage(tracking_infos) {
  //remove old version
  let old_version = document.getElementById("order_tracker");
  if (old_version)
    old_version.remove();

  var node = document.createElement("div");
  node.setAttribute("id", "order_tracker");
  var html = "<h4>Tracking overview</h4>";
  for (var i = 0; i < tracking_infos.length; i++) {
    console.log(tracking_infos[i].order_id);
    html += "<div class='row package'>";
    let tracking = tracking_infos[i].tracking[0];
    mailNo = tracking.consoTagSecondMailNo.length > 0 ? tracking.consoTagSecondMailNo : tracking.mailNo;
    html += "<div class='col-md-12 mailNo'><a href='" + tracking_infos[i].cainiaoUrl + "'>" + mailNo + "</a></div>";
    html += "<div class='col-md-12'>" + tracking.keyDesc + "</div>";
    if (tracking.traceList) {
      html += "<div class='col-md-24'>" + tracking.traceList[0].desc.trim() + "</div>";
      html += "<div class='col-md-12'>" + tracking.traceList[0].eventTimeStr + "</div>";
    } else {
      html += "<div class='col-md-24'></div>";
      html += "<div class='col-md-12'></div>";
    }
    html += "<div class='col-xs-60 order_imgs'>";
    let img_search = document.evaluate("//td[@class='order-info']/p[@class='first-row']/span[@class='info-body' and text()='" + tracking_infos[i].order_id + "']/parent::p/parent::td/parent::tr/parent::tbody//div[@class='product-left']//img", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    for (var j = 0; j < img_search.snapshotLength; j++) {
      var img_node = img_search.snapshotItem(j);
      html += "<div class='col-md-4'>" + img_node.outerHTML + "</div>";
    }
    html += "</div>";
    html += "</div>";

  }
  node.innerHTML = html;
  orderTableNode = document.getElementById("buyer-ordertable");
  orderTableNode.parentNode.insertBefore(node, orderTableNode.nextSibling);
}

var result = document.evaluate(
  "//td[@class='order-info']/p[@class='first-row']/span[@class='info-body']",
  document,
  null,
  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
  null
);

var orderIDs = [];
var tracking_promises = [];
for (var i = 0; i < result.snapshotLength; i++) {
  var node = result.snapshotItem(i);
  orderIDs.push(node.textContent);
  //var tracking_id = await getTrackingID(node.textContent);
  tracking_promises.push(getTrackingID(node.textContent));
  //tracking_numbers.push(tracking_id);
}

Promise.all(tracking_promises).then((tracking_infos) => {
  console.log(tracking_infos);
  injectTrackingOverviewinPage(tracking_infos);
})
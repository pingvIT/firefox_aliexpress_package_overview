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

  // group by mailNo (combined packages)
  const trackingNumberMap = new Map();
  tracking_infos.forEach(info => {
    const mailNo = info.tracking[0].consoTagSecondMailNo.length > 0 ? info.tracking[0].consoTagSecondMailNo : info.tracking[0].mailNo;
    const collection = trackingNumberMap.get(mailNo);
    if (!collection) {
      trackingNumberMap.set(mailNo, [info]);
    } else {
      collection.push(info);
    }
  });

  var html = `<div id="order_tracker"><h4>Tracking overview</h4>`;

  trackingNumberMap.forEach((tracking_infos, mailNo) => {
    let tracking = tracking_infos[0].tracking[0];
    const tracking_header = {
      mailNo,
      url: tracking_infos[0].cainiaoUrl,
      status_coarse: tracking.keyDesc,
      status_fine: "",
      last_update: ""
    }
    if (tracking.traceList) {
      tracking_header.status_fine = tracking.traceList[0].desc;
      tracking_header.last_update = tracking.traceList[0].eventTimeStr;
    }

    if (tracking_infos.length > 1) {
      tracking_header.mailNo += " (Combined)";
    }

    html += `<div class='row package'>
    <div class='col-md-12 mailNo'><a href="${tracking_header.url}">${tracking_header.mailNo}</a></div>
    <div class='col-md-12'>${tracking_header.status_coarse}</div>
    <div class='col-md-24'>${tracking_header.status_fine}</div>
    <div class='col-md-12'>${tracking_header.last_update}</div>
    `
    tracking_infos.forEach((tracking) => {
      html += `<div class='col-xs-60 order_imgs'>`;
      let img_search = document.evaluate("//td[@class='order-info']/p[@class='first-row']/span[@class='info-body' and text()='" + tracking.order_id + "']/parent::p/parent::td/parent::tr/parent::tbody//div[@class='product-left']//img", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
      for (var j = 0; j < img_search.snapshotLength; j++) {
        var img_node = img_search.snapshotItem(j);
        html += `<div class='col-md-4'><img src="${img_node.getAttribute("src")}"></img></div>`;
      }
      html += `</div>`;
    })

    html += `</div>`;

  });
  html += "</div>"

  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, `text/html`)

  orderTableNode = document.getElementById("buyer-ordertable");
  orderTableNode.parentNode.insertBefore(parsed.getElementById("order_tracker"), orderTableNode.nextSibling);
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
console.log("Loaded AliExpress Addon");

/**
 * makes an ajax call for getting the package tracking id
 * @param {string} order_id 
 * @returns promise with the result of the ajax call
 */
function getTrackingID(order_id) {
  return new Promise(function (resolve, reject) {
    var ajaxRequest = new XMLHttpRequest();
    ajaxRequest.onreadystatechange = function () {

      if (ajaxRequest.readyState == 4) {
        if (ajaxRequest.status == 200) {
          var response_string = ajaxRequest.responseText;
          response_string = response_string.substr(6, response_string.length - 6 - 1);
          var response = JSON.parse(response_string);
          response.order_id = order_id;
          console.log(response);
          resolve(response);
        }
        else {
          console.log("error: " + ajaxRequest.status);
          reject("Status error: " + ajaxRequest.status);
        }
      }
    };
    ajaxRequest.open('GET', 'https://ilogisticsaddress.aliexpress.com/ajax_logistics_track.htm?orderId=' + order_id);
    ajaxRequest.send();
  });
}


/**
 * Injects the package overview after the order list
 * @param {[tracking_info from getTrackingID()]} tracking_infos
 */
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

  // for each package display all orders in that package
  trackingNumberMap.forEach((tracking_infos, mailNo) => {
    let tracking = tracking_infos[0].tracking[0];
    const tracking_header = {
      mailNo,
      url: tracking_infos[0].cainiaoUrl,
      status_coarse: tracking.keyDesc,
      status_fine: "",
      last_update: ""
    }
    // tracking status is only available when the package is dispatched
    if (tracking.traceList) {
      tracking_header.status_fine = tracking.traceList[0].desc;
      tracking_header.last_update = tracking.traceList[0].eventTimeStr;
    }

    // more than one tracking numbers -> combined package
    if (tracking_infos.length > 1) {
      tracking_header.mailNo += " (Combined)";
    }

    // header
    html += `<div class='row package'>
    <div class='col-sm-24 col-md-12 mailNo'><a href="${tracking_header.url}">${tracking_header.mailNo}</a></div>
    <div class='col-sm-24 col-md-12'>${tracking_header.status_coarse}</div>
    <div class='col-sm-48 col-md-24'>${tracking_header.status_fine}</div>
    <div class='col-sm-24 col-md-12'>${tracking_header.last_update}</div>
    `
    // row of images for each order contained
    tracking_infos.forEach((tracking) => {
      html += `<div class='col-xs-60 order_imgs'>`;
      let img_search = document.evaluate("//td[@class='order-info']/p[@class='first-row']/span[@class='info-body' and text()='" + tracking.order_id + "']/parent::p/parent::td/parent::tr/parent::tbody//div[@class='product-left']//img", document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
      for (var j = 0; j < img_search.snapshotLength; j++) {
        var img_node = img_search.snapshotItem(j);
        html += `<div class='col-xs-4'><img src="${img_node.getAttribute("src")}"></img></div>`;
      }
      html += `</div>`;
    })

    html += `</div>`;

  });
  html += "</div>"

  // parse the generated html in a new DOM-node
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, `text/html`)

  // insert it after the orderlist, but before the footer
  orderTableNode = document.getElementById("buyer-ordertable");
  orderTableNode.parentNode.insertBefore(parsed.getElementById("order_tracker"), orderTableNode.nextSibling);
}

// get all order id nodes with state shipped
var result = document.evaluate(
  "//tbody[@data-order-status='WAIT_BUYER_ACCEPT_GOODS']//td[@class='order-info']/p[@class='first-row']/span[@class='info-body']",
  document,
  null,
  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
  null
);

// get the tracking status of the order-id
var orderIDs = [];
var tracking_promises = [];
for (var i = 0; i < result.snapshotLength; i++) {
  var node = result.snapshotItem(i);
  const orderID = node.textContent;
  orderIDs.push(orderID);
  tracking_promises.push(getTrackingID(orderID));
}

// wait for the promise results
Promise.allSettled(tracking_promises).then((finishedPromises) => {
  console.log("all settled!")
  // only get the sucessfull promises, then map them to the results
  const sucessfullPromises = finishedPromises.filter((promise) => promise.status === "fulfilled").map((promise) => promise.value);
  // display the results on page
  injectTrackingOverviewinPage(sucessfullPromises);
})
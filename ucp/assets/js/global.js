var SmsC = UCPMC.extend({
	init: function(UCP) {
		this.lastchecked = Math.round(new Date().getTime() / 1000);
		this.dids = [];
		this.icon = "fa fa-comments-o";
		this.supportedFiles = "png|jpg|jpeg|gif|tiff|pdf|vcf|mp3|wav|ogg|mov|avi|mp4|m4a|ical|ics";
		//Logged In
		var Sms = this;
		$(document).bind("logIn", function( event ) {
			$("#sms-menu a.new").on("click", function() {
				var sfrom = "";
				$.each(Sms.dids, function(i, v) {
					sfrom = sfrom + "<option>" + v + "</option>";
				});
				UCP.showDialog(_("Send Message"),
					"<label for=\"SMSfrom\">From:</label> <select id=\"SMSfrom\" class=\"form-control\">" + sfrom + "</select><label for=\"SMSto\">To:</label><select class=\"form-control Tokenize Fill\" id=\"SMSto\" multiple></select><button class=\"btn btn-default\" id=\"initiateSMS\" style=\"margin-left: 72px;\">Initiate</button>",
					200,
					250,
					function() {
						$("#SMSto").tokenize({
							maxElements: 1,
							datas: "index.php?quietmode=1&module=sms&command=contacts"
						});
						$("#initiateSMS").click(function() {
							setTimeout(function() {Sms.initiateChat();}, 50);
						});
						$("#SMSto").keypress(function(event) {
							if (event.keyCode == 13) {
								setTimeout(function() {Sms.initiateChat();}, 50);
							}
						});
					}
				);
			});
			$("#sms-menu a.did").on("click", function() {
				var tdid = $(this).data("did"),
						sfrom = "",
						name = tdid,
						selected = "",
						temp = "";
				if (UCP.validMethod("Contactmanager", "lookup")) {
					if (typeof UCP.Modules.Contactmanager.lookup(tdid).displayname !== "undefined") {
						name = UCP.Modules.Contactmanager.lookup(tdid).displayname;
					} else {
						temp = String(tdid).length == 11 ? String(tdid).substring(1) : tdid;
						if (typeof UCP.Modules.Contactmanager.lookup(temp).displayname !== "undefined") {
							name = UCP.Modules.Contactmanager.lookup(temp).displayname;
						}
					}
				}
				selected = "<option value=\"" + tdid + "\" selected>" + name + "</option>";
				$.each(Sms.dids, function(i, v) {
					sfrom = sfrom + "<option>" + v + "</option>";
				});
				UCP.showDialog(_("Send Message"),
					"<label for=\"SMSfrom\">From:</label> <select id=\"SMSfrom\" class=\"form-control\">" + sfrom + "</select><label for=\"SMSto\">To:</label><select class=\"form-control Tokenize Fill\" id=\"SMSto\" multiple>" + selected + "</select><button class=\"btn btn-default\" id=\"initiateSMS\" style=\"margin-left: 72px;\">Initiate</button>",
					200,
					250,
					function() {
						$("#SMSto").tokenize({
							maxElements: 1,
							datas: "index.php?quietmode=1&module=sms&command=contacts"
						});
						$("#initiateSMS").click(function() {
							setTimeout(function() {Sms.initiateChat();}, 50);
						});
						$("#SMSto").keypress(function(event) {
							if (event.keyCode == 13) {
								setTimeout(function() {Sms.initiateChat();}, 50);
							}
						});
					}
				);
			});
		});

		$(document).on("chatWindowAdded", function(event, windowId, module, object) {
			if (module == "Sms") {
				object.on("click", function() {
					object.find(".title-bar").css("background-color", "");
				});
				var from = object.data("from"),
				to = object.data("to"),
				cwindow = $(".message-box[data-id=\"" + windowId + "\"] .window");
				object.find("textarea").keyup(function(event) {
					if (event.keyCode == 13) {
						var message = $(this).val();
						Sms.sendMessage(windowId, from, to, message);
					}
				});
				object.find(".chat").scroll(function() {
					if ($(this)[0].scrollTop === 0) {
						var id = $(".chat .message:lt(1)").data("id");
						$(".message-box[data-id=\"" + windowId + "\"] .chat .history").prepend('<div class="message status">Loading...</div>');
						$.post( "index.php?quietmode=1&module=sms&command=history", { id: id, from: from, to: to }, function( data ) {
							$(".message-box[data-id=\"" + windowId + "\"] .chat .history .status").remove();
							var html = "";
							$.each(data.messages, function(i, v) {
								html = html + "<div class=\"message "+v.direction+"\" data-id=\"" + v.id + "\">" + v.message + "</div>";
							});
							$(".message-box[data-id=\"" + windowId + "\"] .chat .history").prepend(html);
						});
					}
				});
				object.find(".window").prepend("<input id='file-" + windowId + "' type='file' class='hidden'><label for='file-" + windowId + "'><i class='fa fa-upload'></i></label>");
				$("#file-" + windowId).fileupload({
					url: "?quietmode=1&module=sms&command=upload&from="+from+"&to="+to,
					dropZone: cwindow,
					dataType: "json",
					add: function(e, data) {
						var sup = "\.("+Sms.supportedFiles+")$",
								patt = new RegExp(sup),
								submit = true;
						$.each(data.files, function(k, v) {
							if(!patt.test(v.name)) {
								submit = false;
								alert(_("Unsupported file type"));
								return false;
							}
							if(v.size > 1500000) {
								submit = false;
								alert(_("File size is too large. Max: 1.5mb"));
								return false;
							}
						});
						if(submit) {
							object.find(".response-status").html("");
							object.find(".response-status").prepend('<div class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"><span class="sr-only">0% Complete</span></div></div>');
							data.submit();
						}
					},
					done: function(e, data) {
						if (data.result.status) {
							UCP.addChatMessage(windowId, from, data.result.id, data.result.html, false, true, 'out');
							if($('#sms-grid').length) {
								$('#sms-grid').bootstrapTable('refresh', {silent: true});
							}
						} else {
							object.find(".response-status").html(data.result.message);
						}
						object.find(".progress").remove();
					},
					progressall: function(e, data) {
						var progress = parseInt(data.loaded / data.total * 100, 10);
						object.find(".progress-bar").css("width", progress + "%");
					},
					drop: function(e, data) {
						cwindow.removeClass("hover");
					}
				});
				cwindow.on("dragover", function(event) {
					if (event.preventDefault) {
						event.preventDefault(); // Necessary. Allows us to drop.
					}
					$(this).addClass("hover");
				});
				cwindow.on("dragleave", function(event) {
					$(this).removeClass("hover");
				});
			}
		});

		$(document).bind("staticSettingsFinished", function( event ) {
			if ((typeof Sms.staticsettings !== "undefined") && Sms.staticsettings.enabled) {
				Sms.dids = Sms.staticsettings.dids;
			}
		});
	},
	contactClickInitiate: function(did) {
		var tdid = did, Sms = this,
		sfrom = "",
		name = tdid,
		selected = "",
		temp = "";
		if (UCP.validMethod("Contactmanager", "lookup")) {
			if (typeof UCP.Modules.Contactmanager.lookup(tdid).displayname !== "undefined") {
				name = UCP.Modules.Contactmanager.lookup(tdid).displayname;
			} else {
				temp = String(tdid).length == 11 ? String(tdid).substring(1) : tdid;
				if (typeof UCP.Modules.Contactmanager.lookup(temp).displayname !== "undefined") {
					name = UCP.Modules.Contactmanager.lookup(temp).displayname;
				}
			}
		}

		selected = "<option value=\"" + tdid + "\" selected>" + name + "</option>";
		$.each(Sms.dids, function(i, v) {
			sfrom = sfrom + "<option>" + v + "</option>";
		});
		UCP.showDialog(_("Send Message"),
			"<label for=\"SMSfrom\">From:</label> <select id=\"SMSfrom\" class=\"form-control\">" + sfrom + "</select><label for=\"SMSto\">To:</label><select class=\"form-control Tokenize Fill\" id=\"SMSto\" multiple>" + selected + "</select><button class=\"btn btn-default\" id=\"initiateSMS\" style=\"margin-left: 72px;\">Initiate</button>",
			200,
			250,
			function() {
				$("#SMSto").tokenize({
					maxElements: 1,
					datas: "index.php?quietmode=1&module=sms&command=contacts"
				});
				$("#initiateSMS").click(function() {
					setTimeout(function() {Sms.initiateChat();}, 50);
				});
				$("#SMSto").keypress(function(event) {
					if (event.keyCode == 13) {
						setTimeout(function() {Sms.initiateChat();}, 50);
					}
				});
			}
		);
	},
	contactClickOptions: function(type) {
		if (type != "number") {
			return false;
		}
		return [ { text: _("Send SMS"), function: "contactClickInitiate", type: "sms" } ];
	},
	replaceContact: function(contact) {
		var entry = null;
		if (UCP.validMethod("Contactmanager", "lookup")) {
			scontact = contact.length == 11 ? contact.substring(1) : contact;
			entry = UCP.Modules.Contactmanager.lookup(scontact);
			if (entry !== null && entry !== false) {
				return entry.displayname;
			}
			entry = UCP.Modules.Contactmanager.lookup(contact);
			if (entry !== null && entry !== false) {
				return entry.displayname;
			}
		}
		return contact;
	},
	prepoll: function(data) {
		var Sms = this,
				messageBoxes = { messageWindows: {}, lastchecked: this.lastchecked };
		$(".message-box[data-module=\"Sms\"]").each(function(i, v) {
			var windowid = $(this).data("id"),
					from = $(this).data("from"),
					to = $(this).data("to"),
					last = $(this).data("last-msg-id");
					messageBoxes.messageWindows[i] = { from: from, to: to, last: last, windowid: windowid };
		});
		this.lastchecked = Math.round(new Date().getTime() / 1000);
		return messageBoxes;
	},
	poll: function(data) {
		var Sms = this,
				delivered = [];
		if (data.status) {
			$("#sms-badge").text(data.total);
			$.each(data.messages, function(windowid, messages) {
				$.each(messages, function(index, v) {
					if (!$(".message-box[data-id=\"" + windowid + "\"] .message[data-id=\"" + v.id + "\"]").length) {
						var Notification = new Notify(sprintf(_("New Message from %s"), Sms.replaceContact(v.from)), {
							body: v.html ? _("New Message") : emojione.unifyUnicode(v.body),
							icon: "modules/Sms/assets/images/comment.png",
							timeout: 3
						});
						UCP.addChat("Sms", windowid, Sms.icon, v.did, v.recp, Sms.replaceContact(v.cnam), v.id, v.body, null, true, 'in');
						delivered.push(v.id);
						if (UCP.notify) {
							Notification.show();
						}
					}
				});
			});
			if (delivered.length) {
				$.post( "index.php?quietmode=1&module=sms&command=delivered", { ids: delivered }, function( data ) {});
				if($('#sms-grid').length) {
					$('#sms-grid').bootstrapTable('refresh', {silent: true});
				}
			}
		}
	},
	display: function(event) {
		var Sms = this;
		$(document).on("click", "[vm-pjax] a, a[vm-pjax]", function(event) {
			event.preventDefault(); //stop browser event
			var container = $("#dashboard-content");
			$.pjax.click(event, { container: container });
		});

		$('#sms-grid').on("post-body.bs.table", function () {
			$("#sms-grid .delete").click(function() {
				var from = $(this).data("from"), to = $(this).data("to"), id = $(this).data("id");
				if(confirm(_("Are you sure you wish to delete this conversation?"))) {
					$.post( "index.php?quietmode=1&module=sms&command=delete", { from: from, to: to }, function( data ) {
						if(data.status) {
							$('#sms-grid').bootstrapTable('remove', {field: "id", values: [String(id)]});
						}
					});
				}
			});
			$("#sms-grid .view").click(function() {
				var from = $(this).data("from"), to = $(this).data("to");
				$("#cnam").text(from);
				$('#smspreview').modal('toggle');
				$("#sms-detail-grid").bootstrapTable('showLoading');
				$.post( "index.php?quietmode=1&module=sms&command=messages", { from: from, to: to }, function( data ) {
					$("#sms-detail-grid").bootstrapTable('load', data);
					$("#sms-detail-grid").bootstrapTable('hideLoading');
				});
			});
		});

		if (typeof $.url().param("search") !== "undefined") {
			$(".sms-message-body").highlight($.url().param("search"), "yellow");
		}
	},
	search: function(text) {
		var Sms = this;
		if (text !== "") {
			$.pjax({ url: "?display=dashboard&mod=sms&search=" + encodeURIComponent(text), container: "#dashboard-content" });
		} else {
			$.pjax({ url: "?display=dashboard&mod=sms", container: "#dashboard-content" });
		}
	},
	hide: function(event) {
		var Sms = this;
		$(document).off("click", "[vm-pjax] a, a[vm-pjax]");
	},
	resize: function() {

	},
	initiateChat: function() {
		var Sms = this,
				to = ($("#SMSto").val() !== null) ? $("#SMSto").val()[0] : "",
				from = $("#SMSfrom").val(),
			pattern = new RegExp(/^\d*$/);
		if (to !== "" && pattern.test(to)) {
			to = (to.length === 10) ? "1" + to : to;
			UCP.addChat("Sms", from + to, Sms.icon, from, to);
			UCP.closeDialog();
		} else {
			alert(_("Invalid Number"));
		}
	},
	startChat: function(from, to) {
		var Sms = this;
		UCP.addChat("Sms", from + to, Sms.icon, from, to);
	},
	sendMessage: function(windowId, from, to, message) {
		var Sms = this;
		$(".message-box[data-id='" + windowId + "'] textarea").prop("disabled", true);
		$.post( "index.php?quietmode=1&module=sms&command=send", { from: from, to: to, message: message }, function( data ) {
			if (data.status) {
				$(".message-box[data-id='" + windowId + "'] .response-status").html("");
				UCP.addChatMessage(windowId, from, data.id, message, false, false, 'out');
				$(".message-box[data-id='" + windowId + "'] textarea").val("");
				if($('#sms-grid').length) {
					$('#sms-grid').bootstrapTable('refresh', {silent: true});
				}
			} else {
				$(".message-box[data-id='" + windowId + "'] .response-status").html(data.message);
			}
			$(".message-box[data-id='" + windowId + "'] textarea").prop("disabled", false);
			$(".message-box[data-id='" + windowId + "'] textarea").focus();
		});
	},
	dateFormatter: function(value) {
		return UCP.dateFormatter(value);
	},
	actionFormatter: function(value, row) {
		return '<a><i class="fa fa-eye view" data-from="'+row.from+'" data-to="'+row.to+'"></i></a><a><i class="fa fa-trash-o delete" data-from="'+row.from+'" data-to="'+row.to+'" data-id="'+row.id+'"></i></a></td>';
	},
	toFormatter: function(value, row) {
		return '<a onclick="UCP.Modules.Sms.startChat(\''+row.did+'\',\''+row.recipient+'\')">'+row.recipient+'</a>';
	},
	directionFormatter: function(value) {
		switch(value) {
			case "out":
				return _("Sent");
			break;
			case "in":
				return _("Received");
			break;
		}
	},
	bodyFormatter: function(value, row) {
		return emojione.toImage(value);
	}
});

var challenges = [];
var user_solves = [];
var templates = {};
var category_solves = {};

function loadchal(id) {
    var obj = $.grep(challenges, function (e) {
        return e.id == id;
    })[0];

    updateChalWindow(obj);
}

function loadchalbyname(chalname) {
    var obj = $.grep(challenges, function (e) {
      return e.name == chalname;
    })[0];

    updateChalWindow(obj);
}

function updateChalWindow(obj) {
    $.get(script_root + "/chals/" + obj.id, function(challenge_data){
        $.get(script_root + obj.template, function (template_data) {
            $('#chal-window').empty();
            var template = nunjucks.compile(template_data);
            var solves = obj.solves == 1 ? " Solve" : " Solves";
            var solves = obj.solves + solves;

            var nonce = $('#nonce').val();

            var md = window.markdownit({
                html: true,
            });

            challenge_data['description'] = md.render(challenge_data['description']);
            challenge_data['script_root'] = script_root;
            challenge_data['solves'] = solves;

            $('#chal-window').append(template.render(challenge_data));
            $.getScript(script_root + obj.script,
                function () {
                    // Handle Solves tab
                    $('.chal-solves').click(function (e) {
                        getsolves($('#chal-id').val())
                    });
                    $('.nav-tabs a').click(function (e) {
                        e.preventDefault();
                        $(this).tab('show')
                    });

                    // Handle modal toggling
                    $('#chal-window').on('hide.bs.modal', function (event) {
                        $("#answer-input").removeClass("wrong");
                        $("#answer-input").removeClass("correct");
                        $("#incorrect-key").slideUp();
                        $("#correct-key").slideUp();
                        $("#already-solved").slideUp();
                        $("#too-fast").slideUp();
                    });

                    // $('pre code').each(function(i, block) {
                    //     hljs.highlightBlock(block);
                    // });

                    window.location.replace(window.location.href.split('#')[0] + '#' + obj.name);
                    $('#chal-window').modal();
                });
        });
    });
}

$("#answer-input").keyup(function(event){
    if(event.keyCode == 13){
        $("#submit-key").click();
    }
});


function submitkey(chal, key, nonce, cb) {
    $('#submit-key').addClass("disabled-button");
    $('#submit-key').prop('disabled', true);
    $.post(script_root + "/chal/" + chal, {
        key: key,
        nonce: nonce
    }, function (data) {
        var result = $.parseJSON(JSON.stringify(data));

        var result_message = $('#result-message');
        var result_notification = $('#result-notification');
        var answer_input = $("#answer-input");
        result_notification.removeClass();
        result_message.text(result.message);

        if (result.status == -1){
          window.location = script_root + "/login?next=" + script_root + window.location.pathname + window.location.hash
          return
        }
        else if (result.status == 0){ // Incorrect key
            result_notification.addClass('alert alert-danger alert-dismissable text-center');
            result_notification.slideDown();

            answer_input.removeClass("correct");
            answer_input.addClass("wrong");
            setTimeout(function () {
                answer_input.removeClass("wrong");
            }, 3000);
        }
        else if (result.status == 1){ // Challenge Solved
            result_notification.addClass('alert alert-success alert-dismissable text-center');
            result_notification.slideDown();

            $('.chal-solves').text((parseInt($('.chal-solves').text().split(" ")[0]) + 1 +  " Solves") );

            var updatedCategorySolves = $('.category-header .active').text().replace(/\:([0-9]*)/,function(solves){
                return ':' + (parseInt(solves.replace(':','')) + 1);
            });

            $('.category-header .active').text(updatedCategorySolves)

            answer_input.val("");
            answer_input.removeClass("wrong");
            answer_input.addClass("correct");
        }
        else if (result.status == 2){ // Challenge already solved
            result_notification.addClass('alert alert-info alert-dismissable text-center');
            result_notification.slideDown();

            answer_input.addClass("correct");
        }
        else if (result.status == 3){ // Keys per minute too high
            result_notification.addClass('alert alert-warning alert-dismissable text-center');
            result_notification.slideDown();

            answer_input.addClass("too-fast");
            setTimeout(function() {
                answer_input.removeClass("too-fast");
            }, 3000);
        }
        marksolves();
        updatesolves();
        setTimeout(function(){
          $('.alert').slideUp();
          $('#submit-key').removeClass("disabled-button");
          $('#submit-key').prop('disabled', false);
        }, 3000);

        if (cb) {
            cb(result);
        }
    })
}

function marksolves(cb) {
    $.get(script_root + '/solves', function (data) {
        var solves = $.parseJSON(JSON.stringify(data));
        for (var i = solves['solves'].length - 1; i >= 0; i--) {
            var id = solves['solves'][i].chalid;
            var btn = $('button[value="' + id + '"]');
            btn.addClass('solved-challenge');
            btn.prepend("<i class='fas fa-check corner-button-check'></i>")
        }
        if (cb) {
            cb();
        }
    });
}

function load_user_solves(cb){
    $.get(script_root + '/solves', function (data) {
        var solves = $.parseJSON(JSON.stringify(data));
        for (var i = solves['solves'].length - 1; i >= 0; i--) {
            var chal_id = solves['solves'][i].chalid;
            user_solves.push(chal_id);

            var category = solves['solves'][i].category;
            if(!category_solves[category]){
                category_solves[category] = 1;
            }else{
                category_solves[category] += 1;
            }

        }
        if (cb) {
            cb();
        }
    });
}

function updatesolves(cb){
    $.get(script_root + '/chals/solves', function (data) {
        var solves = $.parseJSON(JSON.stringify(data));
        var chalids = Object.keys(solves);

        for (var i = 0; i < chalids.length; i++) {
            for (var z = 0; z < challenges.length; z++) {
                var obj = challenges[z];
                var solve_cnt = solves[chalids[i]];
                if (obj.id == chalids[i]){
                    if (solve_cnt) {
                        obj.solves = solve_cnt;
                    } else {
                        obj.solves = 0;
                    }
                }
            }
        };
        if (cb) {
            cb();
        }
    });
}

function getsolves(id){
  $.get(script_root + '/chal/'+id+'/solves', function (data) {
    var teams = data['teams'];
    $('.chal-solves').text((parseInt(teams.length) + " Solves"));
    var box = $('#chal-solves-names');
    box.empty();
    for (var i = 0; i < teams.length; i++) {
      var id = teams[i].id;
      var name = teams[i].name;
      var date = moment(teams[i].date).local().fromNow();
      box.append('<tr><td><a href="team/{0}">{1}</td><td>{2}</td></tr>'.format(id, htmlentities(name), date));
    };
  });
}

function loadchals(cb) {
    $.get(script_root + "/chals", function (data) {
        data = $.parseJSON(JSON.stringify(data));
		
		$('#challenges-board').empty();
		
		categories = data['category'];
        games = data['game'];

        $.merge(challenges, games);
		
        var categoryheader = '<ul id="category-header" class="top-category-header nav nav-tabs">';
		var categoryrow = '<div id="category-challenges" class="top-category-challenges tab-content" >';
		for(var i = 0; i < categories.length; i++) {
			var categoryid = categories[i][0].replace(/ /g,"-").hashCode();
			
            var category_solve = category_solves[categories[i][0]];
            if(!category_solve){
                category_solve = 0
            }

            if(i == 0){
				categoryheader += 
					'<li class="category-header nav-item" id="' + categoryid + '-li">' +
						'<a href="#' + categoryid + '-header" data-toggle="tab" class="nav-link active">'+
							categories[i][0] +
                            '('+ categories[i][1] +':' + category_solve +')'+
						'</a>'+
					'</li>';
				categoryrow += 
					'<div id="' + categoryid + '-header" class="category-challenges tab-pane fade show active">' +
						'<div id="' + categoryid + '-row" class="challenges-row col-md-12"></div>' +
					'</div>'
			}else{
				categoryheader += 
					'<li class="category-header nav-item" id="' + categoryid + '-li">' +
						'<a href="#' + categoryid + '-header" data-toggle="tab" class="nav-link">'+
							categories[i][0] +
                            '('+ categories[i][1] +':' + category_solve +')'+
						'</a>'+
					'</li>';
				categoryrow += 
					'<div id="' + categoryid + '-header" class="category-challenges tab-pane fade">' +
						'<div id="' + categoryid + '-row" class="challenges-row col-md-12"></div>' +
					'</div>'
			}
		}
		categoryheader += '</ul>';
		categoryrow += '</div>';
		$('#challenges-board').append(categoryheader+categoryrow);
		
        for (var i = 0; i <= games.length - 1; i++) {
            var chalinfo = games[i];
            var challenge = chalinfo.category.replace(/ /g,"-").hashCode();
            var chalid = chalinfo.name.replace(/ /g,"-").hashCode();
            var catid = chalinfo.category.replace(/ /g,"-").hashCode();
            var chalwrap = $("<div id='{0}' class='col-md-3 d-inline-block'></div>".format(chalid));

            if (user_solves.indexOf(chalinfo.id) == -1){
                var chalbutton = $("<button class='btn btn-dark challenge-button w-100 text-truncate pt-3 pb-3 mb-2' value='{0}'></button>".format(chalinfo.id));
            } else {
                var chalbutton = $("<button class='btn btn-dark challenge-button solved-challenge w-100 text-truncate pt-3 pb-3 mb-2' value='{0}'><i class='fas fa-check corner-button-check'></i></button>".format(chalinfo.id));
            }

            var chalheader = $("<p>{0}</p>".format(chalinfo.name));
            var chalscore = $("<span>{0}</span>".format(chalinfo.value));
            for (var j = 0; j < chalinfo.tags.length; j++) {
                var tag = 'tag-' + chalinfo.tags[j].replace(/ /g, '-');
                chalwrap.addClass(tag);
            }

            chalbutton.append(chalheader);
            chalbutton.append(chalscore);
            chalwrap.append(chalbutton);

            $("#"+ catid +"-row").append(chalwrap);
        };

        // marksolves();
	   
        $('.challenge-button').bind('click', function (e) {
            loadchal(this.value);
        });
		
        updatesolves();

		$('.category-header a').each(function(){
			$(this).bind('click',function(){
				rowid = $(this).attr('href').replace('#','');
				rowid = rowid.replace('-header','') + "-row";
				if($('#'+rowid).html().length < 1){
					category = $(this).html().replace(/\([0-9]*:[0-9]*\)/g,'');
					$.get(script_root + "/chals_ajax/" + category, function (data) {
						data = $.parseJSON(JSON.stringify(data));
                        games = data['game'];
                        $.merge(challenges, games);

						for (var i = 0; i <= games.length - 1; i++) {
							var chalinfo = games[i];
							var challenge = chalinfo.category.replace(/ /g,"-").hashCode();
							var chalid = chalinfo.name.replace(/ /g,"-").hashCode();
							var catid = chalinfo.category.replace(/ /g,"-").hashCode();
							var chalwrap = $("<div id='{0}' class='col-md-3 d-inline-block'></div>".format(chalid));

							if (user_solves.indexOf(chalinfo.id) == -1){
								var chalbutton = $("<button class='btn btn-dark challenge-button w-100 text-truncate pt-3 pb-3 mb-2' value='{0}'></button>".format(chalinfo.id));
							} else {
								var chalbutton = $("<button class='btn btn-dark challenge-button solved-challenge w-100 text-truncate pt-3 pb-3 mb-2' value='{0}'><i class='fas fa-check corner-button-check'></i></button>".format(chalinfo.id));
							}

							var chalheader = $("<p>{0}</p>".format(chalinfo.name));
							var chalscore = $("<span>{0}</span>".format(chalinfo.value));
							for (var j = 0; j < chalinfo.tags.length; j++) {
								var tag = 'tag-' + chalinfo.tags[j].replace(/ /g, '-');
								chalwrap.addClass(tag);
							}

							chalbutton.append(chalheader);
							chalbutton.append(chalscore);
							chalwrap.append(chalbutton);

							$("#"+ catid +"-row").append(chalwrap);
						};

						//marksolves();
					   
                        $('.challenge-button').unbind('click');
						$('.challenge-button').bind('click', function (e) {
							loadchal(this.value);
						});

                        updatesolves();
					});
				}
			});
		});
		
        if (cb){
            cb();
        }
    });
}

function loadhint(hintid){
    var md = window.markdownit({
        html: true,
    });
    ezq({
        title: "解锁提示?",
        body: "你确定打开提示?",
        success: function(){
            $.post(script_root + "/hints/" + hintid, {'nonce': $('#nonce').val()}, function (data) {
                if (data.errors) {
                    ezal({
                        title: "错误!",
                        body: data.errors,
                        button: "确定"
                    });
                } else {

                    ezal({
                        title: "提示",
                        body: md.render(data.hint),
                        button: "打开!"
                    });
                }
            });
        }
    });
}

$('#submit-key').click(function (e) {
    submitkey($('#chal-id').val(), $('#answer-input').val(), $('#nonce').val())
});

$('.chal-solves').click(function (e) {
    getsolves($('#chal-id').val())
});

$('#chal-window').on('hide.bs.modal', function (event) {
    $("#answer-input").removeClass("wrong");
    $("#answer-input").removeClass("correct");
    $("#incorrect-key").slideUp();
    $("#correct-key").slideUp();
    $("#already-solved").slideUp();
    $("#too-fast").slideUp();
});


// $.distint(array)
// Unique elements in array
$.extend({
    distinct : function(anArray) {
       var result = [];
       $.each(anArray, function(i,v){
           if ($.inArray(v, result) == -1) result.push(v);
       });
       return result;
    }
});

var load_location_hash = function () {
    if (window.location.hash.length > 0) {
        loadchalbyname(window.location.hash.substring(1));
    }
};

function update(cb){
    load_user_solves(function () { // Load the user's solved challenge ids
        loadchals(cb);
    });
}

$(function() {
    update(function(){
        load_location_hash();
    });
});

$('.modal-body .nav-tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show')
})

$('#chal-window').on('hidden.bs.modal', function() {
    $('.modal-body .nav-tabs a:first').tab('show');
    history.replaceState('', document.title, window.location.pathname);
});

//setInterval(update, 5000);

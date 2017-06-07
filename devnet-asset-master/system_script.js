/* global $*/

var baseURL = 'https://cybozudev.zendesk.com';

$(function() {
    //debug
    //var debugDate = new Date();
    //console.log(debugDate);

    if ($('#page-homepage').length > 0) {
        homepageArticleList(baseURL + '/api/v2/help_center/sections/200129785/articles.json', '#APIUpdate', 5);
        homepageArticleList(baseURL + '/api/v2/help_center/sections/202364246/articles.json', '#sampleUpdate', 6);
        homepageCommunityPostList(10);
    }

    if ($('#page-homepage').length === 0) {
        minHeader();
    }

    //管理者メニューが表示されている際の対応
    if ($('#page-homepage').length === 0 && $('#navbar-container').length > 0) {
        $('.header-min').css('top', '45px');
        $('#sideNav').css('top', '99px').css('height', 'calc(100%-99px)');
    }


    if ($('#sideNav').length > 0) {
        footer2column();
    }

    //検索フォームplaceholder書き換え
    $('form.search input[type="search"]').attr('placeholder', 'developer network内で検索');

    //コミュニティのボタンのラベル書き換え
    if ($('.community-header-subscribe').length > 0) {
        $('.topic-subscribe > a.dropdown-toggle').text('このトピックをフォロー')
            .prepend('<span class="fa fa-rss"></span>');
    }
    if ($('.post-subscribe').length > 0) {
        $('.post-header-subscribe > a.post-subscribe').text('このスレッドをフォロー')
            .prepend('<span class="fa fa-rss"></span>');
    }
    //セクションのボタンのラベル書き換え
    if ($('.section-header').length > 0) {
        $('.section-subscribe > a.dropdown-toggle').text('このセクションをフォロー')
            .prepend('<span class="fa fa-rss"></span>');
    }
    //記事のボタンのラベル書き換え
    if ($('.article-subscribe').length > 0) {
        $('article > a.article-subscribe').text('この記事をフォロー')
            .prepend('<span class="fa fa-rss"></span>');
    }

    //vote-buttonにデフォルトで「はい」が入っているのを削除
    $.each($('.vote-button > a', '#page-community'), function() {
        $(this).removeAttr('title');
    });
    $.each($('.vote-button > a', '#page-article'), function() {
        $(this).removeAttr('title');
    });

    // 検索キーワード保持
    if ($('div .search-results').length > 0) {
        saveSearchWord();
    }

    //記事コメント記入時処理
    $('.comment-form-controls > input', '.article').click(function() {
        postArticleComment();
    });

});


/* ------------------------
 Global
 -------------------------*/
/* ホームページ以外のヘッダー */
function minHeader() {
    $('.header').addClass('header-min');
    $('body').css('paddingTop', '45px');
}
/* 2カラム時のfooter */
function footer2column() {
    $('.footer').addClass('footer2column');
}

/* ------------------------
 ホームページ
 -------------------------*/
/* 下部3カラムの記事リスト */
function homepageArticleList(jsonUrl, displayTarget, limit) {
    $.ajax({
        url: jsonUrl + '?sort_by=created_at&sort_order=desc',
        dataType: 'json',
        async: true,
        success: function(json) {
            data = json;
        }
    }).then(function(data) {
        var articles = data.articles;
        var articlesUL = $('<ul class="list-articles"></ul>');
        var articleLI;
        var articleURL;
        var articleUpdate;
        var articleTitle;
        var sectionLink;

        articles = articles.slice(0, limit);

        $.each(articles, function(index, article) {
            articleURL = article.html_url;
            articleUpdate = article.created_at.substr(0, 10)
                .replace(/-/g, "/");
            articleTitle = article.name;
            /* Date removed 20170109*/
            /*if( displayTarget == "#sampleUpdate") {
                 articleLI = $('<li><a style="margin-left:0px;" href="' + articleURL + '">' + articleTitle + '</a><hr class="hr-line"></li>');
            }
            else
            {
                articleLI = $('<li><span class="updated_at">' + articleUpdate + '</span><a href="' + articleURL + '">' + articleTitle + '</a><hr class="hr-line"></li>');
            }*/
            articleLI = $('<li><a style="margin-left:0px;" href="' + articleURL + '">' + articleTitle + '</a><hr class="hr-line"></li>');
            articlesUL.append(articleLI);
        });
        $(displayTarget).append(articlesUL);

        sectionLink = $('<div class="list-articles-sectionLink"><a href="' + baseURL + '/hc/ja/sections/' + articles[0].section_id + '">一覧はこちら</a></div>');
        if(displayTarget == "#APIUpdate"){
            $('#imgAPIUpdate').after(sectionLink);
        }
        if(displayTarget == "#sampleUpdate"){
            $('#imgsampleUpdate').after(sectionLink);
        }
    });
}

function homepageCommunityPostList(limit) {
    $.ajax({
        url: baseURL + '/api/v2/community/posts.json',
        dataType: 'json',
        async: true,
        success: function(json) {
            data = json;
        }
    }).then(function(data) {
        var posts = data.posts;
        var postsUL = $('<ul class="list-posts"></ul>');
        var postLI;
        var postURL;
        var postTitle;
        var postCommentCount;

        posts = posts.slice(0, limit);

        $.each(posts, function(index, post) {
            postURL = post.html_url;
            postTitle = post.title;
            postCommentCount = post.comment_count;

            postLI = $('<li><span class="commentCount fa fa-comments"> ' + postCommentCount + '</span><a href="' + postURL + '">' + postTitle + '</a><hr class="hr-line"></li>');
  
            if(post.topic_id == "115017926923") {
        		postLI = $('<li><span class="commentCount fa fa-book"> ' + postCommentCount + '</span><a href="' + postURL + '">' + postTitle + '</a><hr class="hr-line"></li>');
     		}
       		
            postsUL.append(postLI);
        });

        $('.top-communityPost-list').append(postsUL);

    });
}

/* ------------------------------------------------------------------------
 sideNavのメニュー展開 (サイドメニューがセクションになっている記事)
 -------------------------------------------------------------------------*/
function sideNavMenuSection(jsonFileName) {
    var filename = jsonFileName;
    var currentURL = window.location.href;
    var paths = currentURL.split('/');
    var currentID = paths[paths.length - 1].split('-')[0];

    $.ajax({
        url: baseURL + '/api/v2/help_center/articles/' + currentID + '.json',
        dataType: 'json',
        async: true,
        success: function(resp) {
            var secid = resp.article.section_id;
            sideNavMenu(filename, secid.toString());
        }
    });
}

/* ------------------------
 sideNavのメニュー展開
 @jsonFileName： 対象のサイドメイニューのJSON URL
 @sectionID： Tipsの記事などメニューがセクション単位の記事の場合は
             sideNavMenuSection()経由でsectionIDを指定してCallする
 -------------------------*/
function sideNavMenu(data, sectionID) {
    var currentURL = window.location.href;
    var paths = currentURL.split('/');
    var currentID = sectionID || paths[paths.length - 1].split('-')[0];　 // sectionIDがある場合はsectionID優先

    var sideNav = $('#sideNav');
    var categories = data.category;
    var sections;
    var sectionUL;
    var sectionLI;
    var articleUL;
    var articleLI;

    $.each(categories, function(categoryCount, category) {
        sideNav.append('<h4 class="sideNav-categoryName">' + category.name + '</h4>');

        sections = category.section;

        //sections
        $.each(sections, function(sectionCount, section) {
            sectionUL = $('<ul class="sideNav-section"></ul>');
            sectionLI = $('<li><a href="javascript:" title="' + section.name + '">' + section.name + '</a></li>');

            articleUL = $('<ul class="sideNav-articles"></ul>');

            var currentSection = section.article.filter(function(item, index) {
                if (String(item.id) === currentID) {
                    sectionUL.addClass("currentSection open");
                }
            });

            //articles
            $.each(section.article, function(articleCount, article) {

                if (String(article.id) === currentID) {
                    articleLI = $('<li><a class="sideNav-article currentArticle" href="' + article.url + '" title="' + article.name + '">' + article.name + '</a></li>');
                } else {
                    articleLI = $('<li><a class="sideNav-article" href="' + article.url + '" title="' + article.name + '">' + article.name + '</a></li>');
                }
                articleUL.append(articleLI);
            });

            sectionLI.append(articleUL);
            sectionUL.append(sectionLI);
            sideNav.append(sectionUL);

            // メニュー開閉
            $('.sideNav-section > li > a').off('click');
            $('.sideNav-section > li > a').click(function() {
                $(this).closest('.sideNav-section').toggleClass('open');
            });
        });

    });
}

/* ------------------------
  記事ページ
------------------------ */
function copyBtn() {
    var gists = $('.gist');

    $('pre').wrap('<div class="preWrap"></div>');
    var planeCode = $('.preWrap');

    $.each(gists, function(index, gistContents) {
        $(this).attr('id', 'gist-' + index);

        var button = '<div class="copyBtn" data-clipboard-target="#gist-' + index + ' table"><span class="fa fa-copy"></span> Copy<span class="tooltip">クリップボードにコピーしました</span></div>';
        $(this).append(button);
    });

    $.each(planeCode, function(index, codeContents) {
        $(this).attr('id', 'pre-' + index);

        var button = '<div class="copyBtn" data-clipboard-target="#pre-' + index + ' pre"><span class="fa fa-copy"></span> Copy<span class="tooltip">クリップボードにコピーしました</span></div>';
        $(this).append(button);
    });

    var clipboard = new Clipboard('.copyBtn');
    clipboard.on('success', function(e) {
        $(e.trigger).addClass('copied');
        setTimeout(function() {
            $(e.trigger).removeClass('copied');
        }, 1200); // cssのfadeの値とあわせる
        e.clearSelection();
    });
}

function saveSearchWord() {
    var match = location.search.match(/query=(.*?)(&|$)/);
    if(match) {
        $('#query').val(decodeURIComponent(match[1]));
    }
}

function postArticleComment() {
    var cdata = {
        url: location.href.split('?')[0],
        name: HelpCenter.user.name,
        email: HelpCenter.user.email,
        title: encodeURIComponent($('.article-header > h1').text().trim()),
        comment: encodeURIComponent($('#comment_body_ifr').contents().find('#tinymce').html())
    };

    $.ajax({
        url: 'https://functions9a231b73.azurewebsites.net/api/CopyZendeskArticleComment?code=7ZzzWoakW0aH51wjskWVyAQT7tSRelRKSoWERh95bzK21UDOTRu/Rg==',
        type: 'POST',
        data: cdata,
    });
}

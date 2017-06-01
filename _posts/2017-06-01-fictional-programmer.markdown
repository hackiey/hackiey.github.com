---
layout:     post
title:      "FICTIONAL PROGRAMMER"
subtitle:   ""
date:       2017-06-01 00:00:00
author:     "Harry"
tags:
    - 增强学习
---

Fictional programmer 

<h1> 123 </h1>


<script>
    window.onload=function(){ 
        
        $.ajax({
            type: "GET",
            url: "http://api.hackiey.com:8000/api?input1=100&input2=200",
            xhrFields:{'Access-Control-Allow-Origin': '*'}}
        ).done(function(msg){
            console.log ("Data Saved: " + msg)
        }).fail(function(jqXHR, textStatus){
            console.log ("fail: " + textStatus)
        })
    })
} 
    
</script>